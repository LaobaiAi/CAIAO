"""CAIAO Example: Calculator Server (Lightweight path)

Zero-dependency calculator using the lightweight CAIAO path.
Runs in-process with no MCP SDK required.

Run:
    python -c "
    from examples.lightweight.server import Calculator
    from caiao_lightweight.hub import Hub

    hub = Hub()
    hub.register(Calculator())
    print(hub.call_tool('add', {'a': 3, 'b': 4}))
    print(hub.call_tool('divide', {'a': 10, 'b': 0}))
    "
"""
from caiao_lightweight.server import CAIAOServer, tool


class Calculator(CAIAOServer):
    name = "calculator"
    description = "Basic arithmetic operations"
    version = "1.0.0"

    @tool
    def add(self, args: dict) -> dict:
        """Add two numbers."""
        return {"result": args["a"] + args["b"]}

    @tool
    def subtract(self, args: dict) -> dict:
        """Subtract b from a."""
        return {"result": args["a"] - args["b"]}

    @tool
    def multiply(self, args: dict) -> dict:
        """Multiply two numbers."""
        return {"result": args["a"] * args["b"]}

    @tool
    def divide(self, args: dict) -> dict:
        """Divide a by b."""
        if args["b"] == 0:
            return {"error": "Division by zero"}
        return {"result": args["a"] / args["b"]}
