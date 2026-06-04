"""Tests for CAIAO lightweight path — in-process Server and Hub."""
import json
from caiao_lightweight.server import CAIAOServer, tool
from caiao_lightweight.hub import Hub


class TestLightweightServer:
    def test_basic_server(self):
        """A minimal server with @tool should work."""

        class Greeter(CAIAOServer):
            name = "greeter"
            description = "A greeter"

            @tool
            def greet(self, args: dict) -> dict:
                return {"greeting": f"Hello, {args.get('name', 'world')}!"}

        server = Greeter()
        tools = server.list_tools()
        assert len(tools) == 1
        assert tools[0]["name"] == "greet"

        result = server.call_tool("greet", {"name": "CAIAO"})
        assert result["greeting"] == "Hello, CAIAO!"

    def test_unknown_tool(self):
        class Empty(CAIAOServer):
            name = "empty"

        server = Empty()
        result = server.call_tool("nonexistent", {})
        assert "error" in result

    def test_tool_exception_returns_error(self):
        class Fragile(CAIAOServer):
            name = "fragile"

            @tool
            def crash(self, args: dict) -> dict:
                raise ValueError("boom")

        server = Fragile()
        result = server.call_tool("crash", {})
        assert "error" in result
        assert "boom" in result["error"]
        assert "traceback" in result

    def test_list_tools_returns_valid_structure(self):
        class Calc(CAIAOServer):
            name = "calc"

            @tool
            def add(self, args: dict) -> dict:
                """Add two numbers."""
                return {"result": args["a"] + args["b"]}

        server = Calc()
        tools = server.list_tools()
        t = tools[0]
        assert "name" in t
        assert "description" in t
        assert "input_schema" in t

    def test_get_metadata(self):
        class MyServer(CAIAOServer):
            name = "my_server"
            description = "My custom server"
            version = "2.0.0"

        server = MyServer()
        meta = server.get_metadata()
        assert meta["name"] == "my_server"
        assert meta["description"] == "My custom server"
        assert meta["version"] == "2.0.0"
        assert meta["compatibility"]["caiao_spec"] == "lightweight-1.0"
        assert meta["compatibility"]["mcp"] is False

    def test_default_metadata_version(self):
        class Default(CAIAOServer):
            name = "default"

        server = Default()
        meta = server.get_metadata()
        assert meta["version"] == "0.1.0"

    def test_non_dict_result_wrapped(self):
        class NonDict(CAIAOServer):
            name = "nondict"

            @tool
            def ping(self, args: dict) -> str:
                return "pong"

        server = NonDict()
        result = server.call_tool("ping", {})
        assert result["result"] == "pong"


class TestLightweightHub:
    def test_register_and_call(self):
        class Calc(CAIAOServer):
            name = "calc"

            @tool
            def add(self, args: dict) -> dict:
                return {"result": args["a"] + args["b"]}

        hub = Hub()
        hub.register(Calc())
        result = hub.call_tool("add", {"a": 3, "b": 4})
        assert result["result"] == 7

    def test_missing_tool_returns_error(self):
        hub = Hub()
        result = hub.call_tool("nonexistent", {})
        assert "error" in result

    def test_list_tools_from_multiple_servers(self):
        class Calc(CAIAOServer):
            name = "calc"

            @tool
            def add(self, args: dict) -> dict:
                return {"result": args["a"] + args["b"]}

        class Greeter(CAIAOServer):
            name = "greeter"

            @tool
            def greet(self, args: dict) -> dict:
                return {"hello": "world"}

        hub = Hub()
        hub.register(Calc())
        hub.register(Greeter())
        tools = hub.list_tools()
        assert len(tools) == 2
        names = {t["name"] for t in tools}
        assert names == {"add", "greet"}

    def test_parallel_call(self):
        class Calc(CAIAOServer):
            name = "calc"

            @tool
            def add(self, args: dict) -> dict:
                return {"result": args["a"] + args["b"]}

        hub = Hub()
        hub.register(Calc())
        results = hub.call_tools_parallel([("add", {"a": 1, "b": 2}), ("add", {"a": 3, "b": 4})])
        assert len(results) == 2
        assert results[0]["result"] == 3
        assert results[1]["result"] == 7

    def test_get_status(self):
        class Calc(CAIAOServer):
            name = "calc"

        hub = Hub()
        hub.register(Calc())
        status = hub.get_status()
        assert "calc" in status
        assert "in-process" in status["calc"]

    def test_stop_all(self):
        class Calc(CAIAOServer):
            name = "calc"

        hub = Hub()
        hub.register(Calc())
        hub.stop_all()
        # After stop_all, tools should still be available (in-process servers are cleared)
        result = hub.call_tool("add", {"a": 1, "b": 2})
        assert "error" in result


class TestLightweightServerCLI:
    def _run_cli(self, server, args):
        """Capture stdout from run_cli."""
        import io
        from contextlib import redirect_stdout
        buf = io.StringIO()
        with redirect_stdout(buf):
            server.run_cli(args)
        return json.loads(buf.getvalue())

    def test_cli_metadata(self):
        class Calc(CAIAOServer):
            name = "calc"
            description = "A calculator"

        server = Calc()
        result = self._run_cli(server, [])
        assert result["name"] == "calc"

    def test_cli_list_tools(self):
        class Calc(CAIAOServer):
            name = "calc"

            @tool
            def add(self, args: dict) -> dict:
                return {"result": args["a"] + args["b"]}

        server = Calc()
        result = self._run_cli(server, ["list_tools"])
        assert isinstance(result, list)
        assert result[0]["name"] == "add"

    def test_cli_call_tool(self):
        class Calc(CAIAOServer):
            name = "calc"

            @tool
            def add(self, args: dict) -> dict:
                return {"result": args["a"] + args["b"]}

        server = Calc()
        result = self._run_cli(server, ["call_tool", "add", '{"a": 1, "b": 2}'])
        assert result["result"] == 3

    def test_cli_invalid_json(self):
        class Calc(CAIAOServer):
            name = "calc"

            @tool
            def add(self, args: dict) -> dict:
                return {}

        server = Calc()
        result = self._run_cli(server, ["call_tool", "add", "not-json"])
        assert "error" in result

    def test_cli_missing_args(self):
        class Calc(CAIAOServer):
            name = "calc"

        server = Calc()
        result = self._run_cli(server, ["call_tool"])
        assert "error" in result

    def test_cli_unknown_command(self):
        class Calc(CAIAOServer):
            name = "calc"

        server = Calc()
        result = self._run_cli(server, ["unknown_cmd"])
        assert "error" in result
