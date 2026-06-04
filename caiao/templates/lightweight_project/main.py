"""{{name}} — Lightweight CAIAO entry point.

Lightweight CAIAO uses three zero-dependency files (server.py, hub.py, subprocess.py)
from caiao_lightweight/. Copy them to this project directory first, then:

    python main.py

For subprocess-mode servers, start each server first:

    python servers/my_server/server.py --stdio

Then register via hub.register_subprocess().
"""

import sys
import os

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)

try:
    from server import CAIAOServer, tool
    from hub import Hub
    from subprocess import SubprocessManager  # type: ignore[no-redef, attr-defined]
except ImportError:
    print("CAIAO lightweight files not found.")
    print("Copy server.py, hub.py, subprocess.py from caiao_lightweight/ to this directory.")
    print("  cp ../caiao_lightweight/server.py .")
    print("  cp ../caiao_lightweight/hub.py .")
    print("  cp ../caiao_lightweight/subprocess.py .")
    sys.exit(1)


def register_all_servers(hub: Hub) -> None:
    """Import and register your servers here.

    Example (in-process):
        from servers.my_server.server import MyServer
        hub.register(MyServer())

    Example (subprocess):
        hub.register_subprocess(
            "my_server",
            [sys.executable, "servers/my_server/server.py", "--stdio"]
        )
    """
    pass


def main():
    hub = Hub()
    register_all_servers(hub)

    tools = hub.list_tools()
    print(f"Hub ready with {len(tools)} tools: {[t['name'] for t in tools]}")

    # Example: call a tool
    if tools:
        print(f"Try: result = hub.call_tool('{tools[0]['name']}', {{}})")

    print("Press Ctrl+C to stop.")
    try:
        while True:
            pass
    except KeyboardInterrupt:
        pass
    finally:
        hub.stop_all()
        print("Stopped.")


if __name__ == "__main__":
    main()
