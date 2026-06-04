"""CAIAO Example: Calculator Server (MCP SDK path)

A simple MCP Server providing basic arithmetic operations.
Demonstrates the MCP SDK implementation pattern.

Run:
    python examples/calculator/server.py

Test with Hub:
    from caiao.hub import CAIAOClientHub
    hub = CAIAOClientHub(server_configs=[{
        "name": "calculator",
        "command": "python",
        "args": ["examples/calculator/server.py"],
        "tools": ["add", "subtract", "multiply", "divide"],
    }])
    import asyncio
    asyncio.run(hub.call_tool("add", {"a": 3, "b": 4}))
"""
import asyncio
import json
import logging

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("calculator")

server = Server("calculator")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="add",
            description="Add two numbers",
            input_schema={
                "type": "object",
                "properties": {
                    "a": {"type": "number", "description": "First addend"},
                    "b": {"type": "number", "description": "Second addend"},
                },
                "required": ["a", "b"],
            },
        ),
        Tool(
            name="subtract",
            description="Subtract b from a",
            input_schema={
                "type": "object",
                "properties": {
                    "a": {"type": "number", "description": "Minuend"},
                    "b": {"type": "number", "description": "Subtrahend"},
                },
                "required": ["a", "b"],
            },
        ),
        Tool(
            name="multiply",
            description="Multiply two numbers",
            input_schema={
                "type": "object",
                "properties": {
                    "a": {"type": "number", "description": "Multiplicand"},
                    "b": {"type": "number", "description": "Multiplier"},
                },
                "required": ["a", "b"],
            },
        ),
        Tool(
            name="divide",
            description="Divide a by b",
            input_schema={
                "type": "object",
                "properties": {
                    "a": {"type": "number", "description": "Dividend"},
                    "b": {"type": "number", "description": "Divisor"},
                },
                "required": ["a", "b"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    a = arguments.get("a", 0)
    b = arguments.get("b", 0)

    if name == "add":
        result = a + b
    elif name == "subtract":
        result = a - b
    elif name == "multiply":
        result = a * b
    elif name == "divide":
        if b == 0:
            return [TextContent(type="text", text=json.dumps({"error": "Division by zero"}))]
        result = a / b
    else:
        return [TextContent(type="text", text=json.dumps({"error": f"Unknown tool: {name}"}))]

    return [TextContent(type="text", text=json.dumps({"result": result}))]


async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
