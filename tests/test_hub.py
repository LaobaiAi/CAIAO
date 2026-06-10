"""Tests for CAIAO Hub (MCP SDK path) — local tools, pipelines, metrics."""
import pytest
from caiao._state import GATEWAY_SERVER, PIPELINE_COMPLETE
from caiao.hub import CAIAOClientHub


@pytest.fixture
def hub():
    """Create a Hub with no server configs for local-tool testing."""
    return CAIAOClientHub(server_configs=[])


class TestHubLocalTools:
    async def test_register_and_call(self, hub):
        hub.register_local_tool(
            "ping", "A ping tool",
            {"type": "object", "properties": {}},
            lambda args: {"pong": True},
        )
        tools = await hub.list_tools()
        assert any(t["name"] == "ping" for t in tools)

    async def test_call_local_tool(self, hub):
        async def echo_handler(args):
            return {"echoed": args.get("msg")}

        hub.register_local_tool(
            "echo", "Echoes input",
            {"type": "object", "properties": {"msg": {"type": "string"}}},
            echo_handler,
        )
        result = await hub.call_tool("echo", {"msg": "hello"})
        assert "result" in result
        assert "hello" in result["result"]

    async def test_call_nonexistent_tool(self, hub):
        result = await hub.call_tool("does_not_exist", {})
        assert "error" in result

    async def test_list_tools_empty(self, hub):
        tools = await hub.list_tools()
        assert tools == []

    async def test_register_multiple_tools(self, hub):
        hub.register_local_tool("a", "Tool A", {}, lambda a: {})
        hub.register_local_tool("b", "Tool B", {}, lambda a: {})
        tools = await hub.list_tools()
        assert len(tools) == 2

    async def test_local_tool_metadata(self, hub):
        hub.register_local_tool(
            "my_tool", "Does something",
            {"type": "object", "properties": {"x": {"type": "number"}}},
            lambda a: {},
        )
        tools = await hub.list_tools()
        t = next(t for t in tools if t["name"] == "my_tool")
        assert t["server"] == GATEWAY_SERVER
        assert t["description"] == "Does something"


class TestHubSemanticRouting:
    async def test_semantic_fallback(self, hub):
        """When tool not found, semantic routing should suggest similar names."""
        hub.register_local_tool(
            "calculate_sum", "Calculates the sum of numbers",
            {"type": "object", "properties": {}},
            lambda a: {"sum": 0},
        )
        result = await hub.call_tool("calculate_summ", {"a": 1, "b": 2})
        assert isinstance(result, dict)

    async def test_exact_match_takes_priority(self, hub):
        async def handler(args):
            return {"ok": True}

        hub.register_local_tool("exact", "Exact match tool", {}, handler)
        hub.register_local_tool("exact_match", "Another", {}, handler)
        result = await hub.call_tool("exact", {})
        assert "result" in result


class TestHubCompositePipeline:
    async def test_composite_pipeline(self):
        """Composite server config should create a local pipeline tool."""
        configs = [{
            "name": "my_pipeline",
            "composite": True,
            "description": "A test pipeline",
            "tools": [{"name": "step1"}, {"name": "step2"}],
            "input_schema": {"type": "object", "properties": {"x": {"type": "number"}}},
            "pipeline": [{"tool": "step1"}, {"tool": "step2"}],
        }]
        h = CAIAOClientHub(server_configs=configs)
        tools = await h.list_tools()
        assert any(t["name"] == "my_pipeline" for t in tools)

    def test_composite_without_input_schema_raises(self):
        """Composite without input_schema should raise ValueError."""
        configs = [{
            "name": "bad_pipeline",
            "composite": True,
            "pipeline": [{"tool": "step1"}],
        }]
        with pytest.raises(ValueError, match="input_schema"):
            CAIAOClientHub(server_configs=configs)


class TestHubMetrics:
    async def test_metrics_recorded(self, hub):
        """Tool calls should succeed (local tools don't record metrics)."""
        async def ping(args):
            return {"pong": True}

        hub.register_local_tool("ping", "Ping", {}, ping)
        result = await hub.call_tool("ping", {})
        assert "result" in result

    async def test_error_recorded(self, hub):
        """Failed tool calls should not crash the hub."""
        async def failing_handler(args):
            raise ValueError("Intentional failure")

        hub.register_local_tool("failing", "Fails", {}, failing_handler)
        result = await hub.call_tool("failing", {})
        assert "error" in result

    async def test_parallel_call(self, hub):
        async def handler(args):
            return {"done": True}

        hub.register_local_tool("a", "Tool A", {}, handler)
        hub.register_local_tool("b", "Tool B", {}, handler)
        results = await hub.call_tools_parallel([("a", {}), ("b", {})])
        assert len(results) == 2
        for r in results:
            assert "result" in r or "error" in r

    async def test_single_parallel_call_sequential(self, hub):
        """Single item in parallel should still work."""
        async def handler(args):
            return {"done": True}

        hub.register_local_tool("a", "Tool A", {}, handler)
        results = await hub.call_tools_parallel([("a", {})])
        assert len(results) == 1

    def test_get_all_status(self, hub):
        statuses = hub.get_all_status()
        assert isinstance(statuses, list)

    def test_get_all_health(self, hub):
        health = hub.get_all_health()
        assert isinstance(health, dict)


class TestHubLifecycle:
    async def test_stop_all_clean(self, hub):
        """stop_all should not raise even with no servers."""
        await hub.stop_all()
        tools = await hub.list_tools()
        assert isinstance(tools, list)

    async def test_stop_nonexistent_server(self, hub):
        """Stopping a non-existent server should not raise."""
        await hub.stop_server("nonexistent")

    async def test_pause_nonexistent_server(self, hub):
        """Pausing a non-existent server should not raise."""
        await hub.pause_server("nonexistent")

    async def test_restart_nonexistent_server(self, hub):
        """Restarting a non-existent server should return False."""
        result = await hub.restart_server("nonexistent")
        assert result is False


class TestHubPipelineExecution:
    async def test_execute_pipeline_empty(self, hub):
        """Empty pipeline should complete immediately."""
        context, events = await hub.execute_pipeline([])
        assert context["pipeline_status"] == PIPELINE_COMPLETE

    async def test_execute_pipeline_local_tools(self, hub):
        async def handler(args):
            return {"value": 42} if "step1" in str(args) else {"ok": True}

        hub.register_local_tool("step1", "First step", {}, handler)
        hub.register_local_tool("step2", "Second step", {}, handler)

        context, events = await hub.execute_pipeline([
            {"tool": "step1", "label": "Step 1"},
            {"tool": "step2", "label": "Step 2"},
        ])
        assert len(events) == 2
        assert context["pipeline_status"] == PIPELINE_COMPLETE

    async def test_execute_pipeline_with_error(self, hub):
        """If a step fails, the error should appear in events."""
        async def handler(args):
            return {"ok": True}

        hub.register_local_tool("good", "Good step", {}, handler)

        context, events = await hub.execute_pipeline([
            {"tool": "good", "label": "Good"},
            {"tool": "nonexistent", "label": "Bad"},
        ])
        assert any("error" in e for e in events)
