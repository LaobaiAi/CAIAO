"""{{name}} — Gateway entry point.

Minimal FastAPI gateway showing how to wire CAIAOClientHub with an HTTP API.
Replace or extend with your own application logic.
"""
import os
import sys

# Add project root to path so 'servers' imports work in subprocesses
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_DIR)

from caiao import CAIAOClientHub
from caiao.discovery import discover_server_configs, resolve_venv_python

SERVERS_DIR = os.path.join(PROJECT_DIR, "servers")
VENV_PYTHON = resolve_venv_python(project_dir=PROJECT_DIR)

SERVER_CONFIGS = discover_server_configs(
    servers_dir=SERVERS_DIR,
    venv_python=VENV_PYTHON,
)

hub = CAIAOClientHub(SERVER_CONFIGS)


async def startup():
    await hub.start_all()
    tools = await hub.list_tools()
    print(f"Gateway ready with {len(tools)} tools")


async def shutdown():
    await hub.stop_all()


# ----- Example: FastAPI integration -----
# from fastapi import FastAPI
# app = FastAPI(lifespan=lifespan)
#
# from contextlib import asynccontextmanager
# @asynccontextmanager
# async def lifespan(app):
#     await startup()
#     yield
#     await shutdown()
#
# @app.get("/tools")
# async def list_tools():
#     return await hub.list_tools()
#
# @app.post("/tools/call")
# async def call_tool(request: dict):
#     return await hub.call_tool(request["tool"], request.get("arguments", {}))


if __name__ == "__main__":
    import asyncio
    asyncio.run(startup())
    print("Gateway running. Press Ctrl+C to stop.")
    try:
        asyncio.get_event_loop().run_forever()
    except KeyboardInterrupt:
        pass
    finally:
        asyncio.run(shutdown())
