"""CAIAO Lightweight Hub — synchronous, zero-dependency multi-server manager.

Two modes:
- in_process: Import server classes directly, call tools without IPC
- subprocess: Manage servers as stdio subprocesses with JSON-line protocol

Usage (in_process):
    hub = Hub()
    hub.register(MySolver())
    result = hub.call_tool("solve", {"input": 42})

Usage (subprocess):
    hub = Hub()
    hub.register_subprocess("my_solver", ["python", "my_solver.py"])
    result = hub.call_tool("solve", {"input": 42})
"""

import json
import logging
from typing import Any

try:
    from .subprocess import SubprocessManager
except ImportError:
    from subprocess import SubprocessManager

logger = logging.getLogger(__name__)


class Hub:
    """Synchronous hub for tool routing across multiple servers.

    Designed for simplicity: one method to register, one to call, one to list.
    Works in-process (direct calls) or with subprocess (JSON-line protocol).
    """

    def __init__(self):
        self._servers: dict[str, Any] = {}
        self._tool_map: dict[str, str] = {}
        self._subprocesses: dict[str, Any] = {}

    def register(self, server: Any) -> None:
        """Register an in-process CAIAOServer instance."""
        name = server.name
        self._servers[name] = server
        for tool in server.list_tools():
            self._tool_map[tool["name"]] = name
        logger.info(f"Registered in-process server: {name}")

    def register_subprocess(self, name: str, command: list[str], cwd: str | None = None) -> None:
        """Register a server to be managed as a subprocess.

        The subprocess is spawned lazily on first tool call.
        ``cwd`` sets the working directory for the subprocess (optional).
        """
        self._subprocesses[name] = SubprocessManager(name, command, cwd=cwd)

    def _ensure_subprocess(self, server_name: str) -> Any:
        mgr = self._subprocesses.get(server_name)
        if mgr is None:
            return None
        mgr.ensure_running()
        return mgr

    def list_tools(self) -> list[dict[str, Any]]:
        tools: list[dict[str, Any]] = []
        seen: set[str] = set()
        for server in self._servers.values():
            for t in server.list_tools():
                if t["name"] not in seen:
                    tools.append(t)
                    seen.add(t["name"])
        for name, mgr in self._subprocesses.items():
            try:
                for t in mgr.list_tools():
                    if t["name"] not in seen:
                        t["server"] = name
                        tools.append(t)
                        seen.add(t["name"])
            except Exception:
                logger.warning(f"Cannot list tools from subprocess '{name}'")
        return tools

    def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        server_name = self._tool_map.get(tool_name)
        if server_name:
            server = self._servers.get(server_name)
            if server:
                return server.call_tool(tool_name, arguments)
        for name, mgr in self._subprocesses.items():
            try:
                mgr.ensure_running()
                tools = mgr.list_tools()
                for t in tools:
                    if t["name"] == tool_name:
                        self._tool_map[tool_name] = name
                        return mgr.call_tool(tool_name, arguments)
            except Exception as e:
                logger.error(f"Subprocess '{name}' failed: {e}")
        return {"error": f"Tool '{tool_name}' not found in any registered server"}

    def call_tools_parallel(self, tool_calls: list[tuple[str, dict[str, Any]]]) -> list[dict[str, Any]]:
        return [self.call_tool(name, args) for name, args in tool_calls]

    def get_status(self) -> dict[str, str]:
        status: dict[str, str] = {}
        for name in self._servers:
            status[name] = "running (in-process)"
        for name, mgr in self._subprocesses.items():
            status[name] = "running" if mgr.is_running() else "stopped"
        return status

    def stop_all(self) -> None:
        for mgr in self._subprocesses.values():
            try:
                mgr.stop()
            except Exception:
                pass
        self._servers.clear()
        self._tool_map.clear()
        logger.info("All servers stopped")
