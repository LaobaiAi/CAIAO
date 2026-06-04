"""CAIAO Server: {{name}}"""
import asyncio
import json
import logging

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [{{name}}] %(message)s",
)
logger = logging.getLogger("{{name}}")

server = Server("{{name}}")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="hello",
            description="A simple greeting tool — replace with your own",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name to greet",
                    },
                },
                "required": [],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "hello":
        who = arguments.get("name", "world")
        result = {"greeting": f"Hello, {who}!", "server": "{{name}}"}
        return [TextContent(type="text", text=json.dumps(result))]

    return [TextContent(type="text", text=json.dumps(
        {"error": f"Unknown tool: {name}"}
    ))]


async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
