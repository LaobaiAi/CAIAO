"""CAIAOClientHub manages multiple CAIAO servers as stdio subprocesses."""

import asyncio
import json
import logging
import time
from collections.abc import Callable
from typing import Any

from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

from ._parallel import get_parallel_limit
from ._semantic import semantic_search, tokenize
from ._state import (
    GATEWAY_SERVER,
    PIPELINE_COMPLETE,
    PIPELINE_PARTIAL,
    STATE_ARCHIVED,
    STATE_COMPOSITE,
    STATE_CRASHED,
    STATE_HIBERNATING,
    STATE_REGISTERED,
    STATE_RUNNING,
    STATE_STARTING,
    STATE_STOPPED,
)

logger = logging.getLogger(__name__)


class CAIAOClientHub:
    """Manages lifecycle and routing for multiple CAIAO Server subprocesses.

    Servers with ``lazy=True`` are NOT started during ``start_all()`` —
    they are spawned on-demand when a tool from that server is first requested.
    """

    def __init__(
        self,
        server_configs: list[dict[str, Any]],
        trim_field_blacklist: set[str] | None = None,
        load_checker: Callable[[], float] | None = None,
    ):
        self._server_configs = server_configs
        self._trim_field_blacklist: set[str] = trim_field_blacklist or set()
        self._load_checker = load_checker
        self._sessions: dict[str, Any] = {}
        self._contexts: dict[str, tuple[Any, Any, Any, Any]] = {}
        self._tool_registry: dict[str, str] = {}
        self._tool_to_config: dict[str, str] = self._build_tool_config_map()
        self._local_tools: dict[str, dict[str, Any]] = {}
        self._local_handlers: dict[str, Any] = {}
        self._semantic_index: list[dict[str, Any]] = []
        self._server_states: dict[str, dict[str, Any]] = {}
        self._metrics: dict[str, dict[str, Any]] = {}
        self._init_server_states()
        self._build_semantic_index()
        self._build_composite_handlers()

    def register_local_tool(
        self, name: str, description: str,
        input_schema: dict[str, Any], handler: Any,
    ) -> None:
        self._local_tools[name] = {
            "name": name, "description": description,
            "input_schema": input_schema, "server": GATEWAY_SERVER,
        }
        self._local_handlers[name] = handler
        keywords = tokenize(f"{name} {description}")
        self._semantic_index.append({
            "name": name, "keywords": keywords, "description": description,
        })
        logger.info(f"Registered local tool '{name}'")

    def _build_composite_handlers(self) -> None:
        for config in self._server_configs:
            if config.get("composite"):
                self._register_composite_pipeline(config)

    def _register_composite_pipeline(self, config: dict[str, Any]) -> None:
        name = config["name"]
        pipeline = config.get("pipeline", [])
        description = config.get(
            "description",
            f"Pipeline: {' → '.join(s.get('tool', '?') for s in pipeline)}",
        )
        input_schema = config.get("input_schema")
        if not input_schema:
            raise ValueError(
                f"Composite pipeline '{name}' requires an 'input_schema' field in its config"
            )

        async def _pipeline_handler(arguments: dict) -> dict:
            import json as _json
            ctx = dict(arguments)
            for i, step in enumerate(pipeline):
                tool_name = step["tool"]
                input_map = step.get("input_map", {})
                result_var = step.get("map_result", tool_name)
                tool_args = {}
                if input_map:
                    for arg_key, ctx_key in input_map.items():
                        tool_args[arg_key] = ctx.get(ctx_key)
                else:
                    tool_args = arguments
                raw = await self.call_tool(tool_name, tool_args)
                if "error" in raw:
                    return {
                        "status": PIPELINE_PARTIAL,
                        "error": f"Step {i} ({tool_name}): {raw['error']}",
                        "context": {k: str(v)[:500] for k, v in ctx.items()},
                    }
                result_data = raw.get("result", "{}")
                if isinstance(result_data, str):
                    try:
                        result_data = _json.loads(result_data)
                    except _json.JSONDecodeError:
                        result_data = {"raw": result_data}
                ctx[result_var] = result_data
            result = {"status": PIPELINE_COMPLETE}
            for k, v in ctx.items():
                if k == "status":
                    continue
                result[k] = v
            return result

        self.register_local_tool(name, description, input_schema, _pipeline_handler)
        logger.info(f"Composite pipeline: '{name}' ({len(pipeline)} steps)")

    def _init_server_states(self) -> None:
        for config in self._server_configs:
            name = config["name"]
            is_composite = config.get("composite", False)
            is_lazy = config.get("lazy", False)
            self._server_states[name] = {
                "state": STATE_COMPOSITE if is_composite else (STATE_HIBERNATING if is_lazy else STATE_REGISTERED),
                "pid": None, "started_at": None, "crash_count": 0,
                "restart_count": 0, "max_restarts": 3, "last_error": None,
            }
            self._metrics[name] = {
                "total_calls": 0, "error_count": 0,
                "total_latency_ms": 0.0, "avg_latency_ms": 0.0,
                "last_called": None, "tool_metrics": {},
            }

    def _build_tool_config_map(self) -> dict[str, str]:
        mapping: dict[str, str] = {}
        for config in self._server_configs:
            tools_list = config.get("tools")
            if tools_list and isinstance(tools_list, list):
                for tool in tools_list:
                    name = tool if isinstance(tool, str) else tool.get("name", "")
                    if name:
                        mapping[name] = config["name"]
        return mapping

    def _build_semantic_index(self) -> None:
        _seen: set[str] = set()
        for name, meta in self._local_tools.items():
            desc = meta.get("description", "")
            keywords = tokenize(f"{name} {desc}")
            self._semantic_index.append({
                "name": name, "keywords": keywords, "description": desc,
            })
            _seen.add(name)
        for config in self._server_configs:
            for tool in config.get("tools", []):
                tool_name = tool if isinstance(tool, str) else tool.get("name", "")
                if not tool_name or tool_name in _seen:
                    continue
                desc = config.get("description", "")
                keywords = tokenize(f"{tool_name} {desc}")
                self._semantic_index.append({
                    "name": tool_name, "keywords": keywords, "description": desc,
                })
                _seen.add(tool_name)

    async def start_all(self) -> None:
        for config in self._server_configs:
            if config.get("lazy", False):
                logger.info(f"Skipping lazy server '{config['name']}'")
                continue
            if config.get("composite"):
                logger.info(f"Skipping composite '{config['name']}'")
                continue
            await self._start_one(config)

    async def _start_one(self, config: dict[str, Any]) -> None:
        name = config["name"]
        if name in self._sessions:
            return
        self._server_states.setdefault(name, {})["state"] = STATE_STARTING
        server_params = StdioServerParameters(
            command=config["command"], args=config["args"],
            cwd=config.get("cwd"),
        )
        logger.info(f"Starting '{name}': {config['command']} {' '.join(config['args'])}")
        cm = stdio_client(server_params)
        read, write = await cm.__aenter__()
        session: Any = ClientSession(read, write)
        await session.__aenter__()
        await session.initialize()
        self._sessions[name] = session
        self._contexts[name] = (cm, session, read, write)
        tools_result = await session.list_tools()
        for tool in tools_result.tools:
            self._tool_registry[tool.name] = name
            desc = getattr(tool, "description", "") or ""
            keywords = tokenize(f"{tool.name} {desc}")
            self._semantic_index.append({
                "name": tool.name, "keywords": keywords, "description": desc,
            })
        st = self._server_states.setdefault(name, {})
        st["state"] = STATE_RUNNING
        st["pid"] = getattr(read, "pid", None) or getattr(write, "pid", None)
        st["started_at"] = time.time()
        logger.info(f"'{name}' ready with {len(tools_result.tools)} tools")

    async def _ensure_server(self, tool_name: str, config_hint: str | None = None) -> bool:
        server_name = self._tool_registry.get(tool_name)
        if server_name and server_name in self._sessions:
            return True
        config_name = config_hint or self._tool_to_config.get(tool_name)
        if config_name:
            config = next((c for c in self._server_configs if c["name"] == config_name), None)
            if config:
                try:
                    await self._start_one(config)
                except Exception as e:
                    logger.error(f"Failed to start '{config_name}': {e}")
                    return False
                return tool_name in self._tool_registry
        for config in self._server_configs:
            if not config.get("lazy", False):
                continue
            try:
                await self._start_one(config)
            except Exception as e:
                logger.error(f"Failed to start lazy '{config['name']}': {e}")
                return False
            if tool_name in self._tool_registry:
                return True
        return False

    async def list_tools(self) -> list[dict[str, Any]]:
        tools = list(self._local_tools.values())
        for name, session in self._sessions.items():
            try:
                result = await session.list_tools()
                for tool in result.tools:
                    tools.append({
                        "name": tool.name,
                        "description": tool.description or "",
                        "input_schema": tool.inputSchema if hasattr(tool, "inputSchema") else {},
                        "server": name,
                    })
            except Exception:
                logger.warning(f"Failed to list tools from '{name}'")
        seen_names = {t["name"] for t in tools}
        for config in self._server_configs:
            if config.get("lazy") and not config.get("composite"):
                server_name = config["name"]
                for tool_name in config.get("tools", []):
                    if tool_name not in seen_names:
                        tools.append({
                            "name": tool_name,
                            "description": f"Tool from CAIAO server '{server_name}' (lazy)",
                            "input_schema": {"type": "object", "properties": {}},
                            "server": server_name, "lazy": True,
                        })
                        seen_names.add(tool_name)
        return tools

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        handler = self._local_handlers.get(tool_name)
        if handler:
            logger.info(f"Local tool: {tool_name}")
            try:
                result = await handler(arguments)
                return {"result": json.dumps(result) if not isinstance(result, str) else result}
            except Exception as e:
                logger.exception(f"Local tool '{tool_name}' failed")
                return {"error": str(e)}
        server_name = self._tool_registry.get(tool_name)
        if server_name is None:
            config_hint = self._tool_to_config.get(tool_name)
            if not await self._ensure_server(tool_name, config_hint=config_hint):
                match = semantic_search(tool_name, self._semantic_index)
                if match and match["name"] != tool_name:
                    logger.info(f"Semantic routing '{tool_name}' → '{match['name']}'")
                    return await self.call_tool(match["name"], arguments)
                suggestions = f" Did you mean '{match['name']}'?" if match else ""
                return {"error": f"Tool '{tool_name}' not found.{suggestions}"}
            server_name = self._tool_registry.get(tool_name)
        assert server_name is not None, f"Server for '{tool_name}' should be registered"
        session = self._sessions.get(server_name)
        if session is None:
            return {"error": f"Server '{server_name}' is not connected"}
        call_start = time.time()
        try:
            result = await session.call_tool(tool_name, arguments=arguments)
            elapsed_ms = (time.time() - call_start) * 1000
            self._record_metric(server_name, tool_name, elapsed_ms, None)
            if hasattr(result, "content") and result.content:
                texts = []
                for item in result.content:
                    if hasattr(item, "text"):
                        texts.append(item.text)
                    elif isinstance(item, dict) and "text" in item:
                        texts.append(item["text"])
                return {"result": texts[0] if len(texts) == 1 else texts}
            return {"result": str(result)}
        except Exception as e:
            elapsed_ms = (time.time() - call_start) * 1000
            self._record_metric(server_name, tool_name, elapsed_ms, str(e))
            logger.exception(f"Tool call '{tool_name}' failed")
            return {"error": str(e)}

    def _record_metric(self, server_name: str, tool_name: str, latency_ms: float, error: str | None) -> None:
        m = self._metrics.setdefault(server_name, {})
        m["total_calls"] = m.get("total_calls", 0) + 1
        m["total_latency_ms"] = m.get("total_latency_ms", 0.0) + latency_ms
        m["avg_latency_ms"] = round(m["total_latency_ms"] / m["total_calls"], 2)
        m["last_called"] = time.time()
        if error:
            m["error_count"] = m.get("error_count", 0) + 1
        tm = m.setdefault("tool_metrics", {})
        tm.setdefault(tool_name, {"calls": 0, "errors": 0, "total_latency_ms": 0.0})
        tm[tool_name]["calls"] += 1
        tm[tool_name]["total_latency_ms"] += latency_ms
        tm[tool_name]["avg_latency_ms"] = round(tm[tool_name]["total_latency_ms"] / tm[tool_name]["calls"], 2)
        if error:
            tm[tool_name]["errors"] += 1

    async def call_tools_parallel(
        self, tool_calls: list[tuple[str, dict[str, Any]]],
    ) -> list[dict[str, Any]]:
        if len(tool_calls) <= 1:
            return [await self.call_tool(tn, a) for tn, a in tool_calls]
        limit = get_parallel_limit(len(tool_calls), self._load_checker)
        if limit >= len(tool_calls):
            async def _call(tn: str, a: dict) -> dict:
                return await self.call_tool(tn, a)
            tasks = [asyncio.create_task(_call(tn, a)) for tn, a in tool_calls]
            return await asyncio.gather(*tasks, return_exceptions=True)
        elif limit > 1:
            results: list[dict[str, Any]] = []
            for i in range(0, len(tool_calls), limit):
                batch = tool_calls[i:i + limit]
                async def _batch(tn: str, a: dict) -> dict:
                    return await self.call_tool(tn, a)
                tasks = [asyncio.create_task(_batch(tn, a)) for tn, a in batch]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                results.extend([
                    r if isinstance(r, dict) else {"error": str(r)}
                    for r in batch_results
                ])
            return results
        else:
            return [await self.call_tool(tn, a) for tn, a in tool_calls]

    async def execute_pipeline(
        self, steps: list[dict[str, Any]],
        initial_context: dict[str, Any] | None = None,
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        context = dict(initial_context or {})
        progress_events: list[dict[str, Any]] = []
        total = len(steps)
        for i, step in enumerate(steps):
            tool_name = step["tool"]
            arguments = step.get("arguments", {})
            label = step.get("label", tool_name)
            server_hint = step.get("server")
            logger.info(f"Pipeline [{i+1}/{total}]: {label} ({tool_name})")
            if server_hint:
                await self._ensure_server(tool_name, server_hint)
            else:
                await self._ensure_server(tool_name)
            result = await self.call_tool(tool_name, arguments)
            context[tool_name] = result
            event: dict[str, Any] = {
                "phase": label, "progress": round((i + 1) / total, 2),
                "step_index": i, "total_steps": total,
                "tool": tool_name, "data": self._trim_pipeline_result(result),
            }
            if "error" in result:
                event["error"] = result["error"]
                progress_events.append(event)
                break
            progress_events.append(event)
        context["pipeline_status"] = PIPELINE_COMPLETE if len(progress_events) == total else PIPELINE_PARTIAL
        return context, progress_events

    def _trim_pipeline_result(self, result: dict[str, Any], max_len: int = 2000) -> dict[str, Any]:
        trimmed: dict[str, Any] = {}
        for k, v in result.items():
            if k in self._trim_field_blacklist:
                trimmed[k] = f"[{len(v)} items]" if isinstance(v, list) else str(v)[:200]
            elif k == "error":
                trimmed[k] = str(v)[:500]
            elif isinstance(v, str) and len(v) > max_len:
                trimmed[k] = v[:max_len] + "..."
            else:
                trimmed[k] = v
        return trimmed

    def get_all_status(self) -> list[dict[str, Any]]:
        results = []
        for name, state in self._server_states.items():
            metrics = self._metrics.get(name, {})
            results.append({
                "name": name,
                "state": state.get("state", "unknown"),
                "pid": state.get("pid"),
                "started_at": state.get("started_at"),
                "crash_count": state.get("crash_count", 0),
                "restart_count": state.get("restart_count", 0),
                "total_calls": metrics.get("total_calls", 0),
                "error_count": metrics.get("error_count", 0),
                "avg_latency_ms": metrics.get("avg_latency_ms", 0),
            })
        return results

    def get_all_health(self) -> dict[str, Any]:
        return {
            name: {
                "state": st.get("state", "unknown"),
                "pid": st.get("pid"),
                "started_at": st.get("started_at"),
                "crash_count": st.get("crash_count", 0),
                "last_error": st.get("last_error"),
            }
            for name, st in self._server_states.items()
        }

    def get_metrics(self) -> dict[str, dict[str, Any]]:
        return dict(self._metrics)

    async def restart_server(self, name: str) -> bool:
        await self.stop_server(name)
        config = next((c for c in self._server_configs if c["name"] == name), None)
        if config is None:
            return False
        try:
            await self._start_one(config)
            return True
        except Exception as e:
            logger.error(f"Failed to restart '{name}': {e}")
            st = self._server_states.setdefault(name, {})
            st["state"] = STATE_CRASHED
            st["crash_count"] = st.get("crash_count", 0) + 1
            st["last_error"] = str(e)
            return False

    async def pause_server(self, name: str) -> None:
        ctx = self._contexts.pop(name, None)
        if ctx is not None:
            cm, session, read, write = ctx
            try:
                await session.__aexit__(None, None, None)
            except Exception:
                pass
            try:
                await cm.__aexit__(None, None, None)
            except Exception:
                pass
            self._sessions.pop(name, None)
            for tool, svr in list(self._tool_registry.items()):
                if svr == name:
                    del self._tool_registry[tool]
        st = self._server_states.get(name, {})
        st["state"] = STATE_HIBERNATING
        logger.info(f"Server '{name}' paused")

    async def stop_server(self, name: str) -> None:
        ctx = self._contexts.pop(name, None)
        if ctx is None:
            self._sessions.pop(name, None)
            return
        cm, session, read, write = ctx
        try:
            await session.__aexit__(None, None, None)
        except Exception:
            pass
        try:
            await cm.__aexit__(None, None, None)
        except Exception:
            pass
        self._sessions.pop(name, None)
        for tool, svr in list(self._tool_registry.items()):
            if svr == name:
                del self._tool_registry[tool]
        st = self._server_states.get(name, {})
        st["state"] = STATE_STOPPED
        logger.info(f"Server '{name}' stopped")

    async def stop_all(self) -> None:
        for cm, session, read, write in self._contexts.values():
            try:
                await session.__aexit__(None, None, None)
            except Exception:
                pass
            try:
                await cm.__aexit__(None, None, None)
            except Exception:
                pass
        self._sessions.clear()
        self._contexts.clear()
        self._tool_registry.clear()
        for st in self._server_states.values():
            if st.get("state") not in (STATE_COMPOSITE, STATE_ARCHIVED):
                st["state"] = STATE_STOPPED
        logger.info("All CAIAO servers stopped")
