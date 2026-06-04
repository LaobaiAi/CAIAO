"""CAIAO Lightweight — zero-dependency CAIAO implementation.

Copy these files into your project. No pip install needed.

Usage:
    from caiao_lightweight import CAIAOServer, tool, Hub

    class MyServer(CAIAOServer):
        name = "my_server"
        @tool
        def do_work(self, args: dict) -> dict:
            return {"result": "done"}

    hub = Hub()
    hub.register(MyServer())
    result = hub.call_tool("do_work", {})
"""

from .hub import Hub
from .server import CAIAOServer, tool
from .subprocess import SubprocessManager

__all__ = ["CAIAOServer", "tool", "Hub", "SubprocessManager"]
