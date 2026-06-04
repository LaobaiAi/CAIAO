"""CAIAO Server base class and @tool decorator — zero-dependency lightweight path.

Usage:
    from caiao_lightweight.server import CAIAOServer, tool

    class MySolver(CAIAOServer):
        name = "my_solver"
        description = "My custom solver"

        @tool
        def solve(self, input_data: dict) -> dict:
            ...

    if __name__ == "__main__":
        import sys
        server = MySolver()
        server.run_cli(sys.argv[1:])
"""

import json
import sys
import traceback
from functools import wraps
from typing import Any, Callable


def tool(func: Callable) -> Callable:
    """Decorator that marks a method as a CAIAO tool.

    The decorated method should accept a single dict argument and return a dict.
    """
    func._is_caiao_tool = True
    return func


class CAIAOServer:
    """Base class for lightweight CAIAO servers.

    Subclass and use @tool to register tools. Override class-level attributes
    for metadata. Supports in-process direct calls and stdio subprocess mode.
    """

    name: str = ""
    description: str = ""
    version: str = "0.1.0"

    def __init__(self):
        self._tools: dict[str, dict[str, Any]] = {}
        self._discover_tools()

    def _discover_tools(self) -> None:
        for attr_name in dir(self):
            attr = getattr(self, attr_name)
            if callable(attr) and getattr(attr, "_is_caiao_tool", False):
                tool_name = attr_name
                doc = (attr.__doc__ or "").strip()
                self._tools[tool_name] = {
                    "name": tool_name,
                    "description": doc.split("\n")[0] if doc else tool_name,
                    "handler": attr,
                }

    def list_tools(self) -> list[dict[str, Any]]:
        return [
            {
                "name": info["name"],
                "description": info["description"],
                "input_schema": {"type": "object", "properties": {}},
            }
            for info in self._tools.values()
        ]

    def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        info = self._tools.get(tool_name)
        if info is None:
            return {"error": f"Unknown tool: {tool_name}"}
        try:
            result = info["handler"](arguments)
            if not isinstance(result, dict):
                result = {"result": result}
            return result
        except Exception as e:
            return {"error": str(e), "traceback": traceback.format_exc()}

    def get_metadata(self) -> dict[str, Any]:
        """Return server metadata — called by Hub for discovery."""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "tools": [t["name"] for t in self.list_tools()],
            "compatibility": {"caiao_spec": "lightweight-1.0", "mcp": False},
        }

    def run_stdio(self) -> None:
        """JSON-line protocol over stdin/stdout for subprocess Hub.

        Reads one JSON object per line from stdin, writes one JSON object per
        line to stdout. Each request has ``{"method": "...", "params": ...}``.
        """
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                request = json.loads(line)
            except json.JSONDecodeError:
                print(json.dumps({"error": "Invalid JSON"}))
                sys.stdout.flush()
                continue
            method = request.get("method", "")
            params = request.get("params") or {}

            if method == "list_tools":
                print(json.dumps(self.list_tools()))
            elif method == "call_tool":
                result = self.call_tool(params.get("name", ""), params.get("arguments", {}))
                print(json.dumps(result))
            elif method == "metadata":
                print(json.dumps(self.get_metadata()))
            else:
                print(json.dumps({"error": f"Unknown method: {method}"}))
            sys.stdout.flush()

    def run_cli(self, args: list[str] | None = None) -> None:
        """CLI mode: single-command execution via command-line arguments.

        Usage:
            python server.py                   # Print metadata
            python server.py list_tools        # Print all tools
            python server.py call_tool <name> '<json_args>'
            python server.py metadata
        """
        if args is None:
            args = sys.argv[1:]
        if not args:
            print(json.dumps(self.get_metadata()))
            return
        command = args[0]
        if command == "list_tools":
            print(json.dumps(self.list_tools()))
        elif command == "call_tool":
            if len(args) < 3:
                print(json.dumps({"error": "Usage: call_tool <name> <json_args>"}))
                return
            tool_name = args[1]
            try:
                arguments = json.loads(args[2])
            except json.JSONDecodeError as e:
                print(json.dumps({"error": f"Invalid JSON: {e}"}))
                return
            result = self.call_tool(tool_name, arguments)
            print(json.dumps(result))
        elif command == "metadata":
            print(json.dumps(self.get_metadata()))
        else:
            print(json.dumps({"error": f"Unknown command: {command}"}))


if __name__ == "__main__":
    # If run directly: python my_server.py [--stdio]
    # --stdio mode: JSON-line protocol over stdin/stdout (for SubprocessManager)
    # CLI mode: arguments-driven (for manual testing)
    print(json.dumps({
        "error": (
            "This file is a library. Create your own server.py that subclasses"
            " CAIAOServer and handles __main__."
        ),
    }))
