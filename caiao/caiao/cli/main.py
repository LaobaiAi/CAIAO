"""CAIAO CLI — project scaffolding and server management.

Usage:
    caiao init <project-name> [--lightweight]
    caiao new server <server-name> [--kind atomic-mcp|composite]
    caiao validate
    caiao list
    caiao doctor
"""

import os
import sys


def main():
    args = sys.argv[1:]
    if not args:
        _print_usage()
        return

    cmd = args[0]

    if cmd == "init":
        _cmd_init(args[1:])
    elif cmd == "new":
        _cmd_new(args[1:])
    elif cmd == "validate":
        _cmd_validate()
    elif cmd == "list":
        _cmd_list()
    elif cmd == "doctor":
        _cmd_doctor()
    else:
        print(f"Unknown command: {cmd}")
        _print_usage()


def _print_usage():
    print("CAIAO CLI")
    print("  caiao init <name>         Create a new CAIAO project")
    print("  caiao new server <name>   Create a new CAIAO server")
    print("  caiao validate            Validate all caiao.yaml manifests")
    print("  caiao list                List all servers")
    print("  caiao doctor              Diagnose environment")


def _cmd_init(args: list[str]):
    if not args:
        print("Usage: caiao init <project-name> [--lightweight]")
        return
    name = args[0]
    use_lightweight = "--lightweight" in args
    target_dir = os.path.join(os.getcwd(), name)
    if os.path.exists(target_dir):
        print(f"Error: '{target_dir}' already exists")
        return
    os.makedirs(target_dir, exist_ok=True)
    os.makedirs(os.path.join(target_dir, "servers"), exist_ok=True)

    if use_lightweight:
        _copy_template("lightweight_project", target_dir)
    else:
        _copy_template("mcp_project", target_dir)

    readme = os.path.join(target_dir, "README.md")
    with open(readme, "w", encoding="utf-8") as f:
        f.write(f"# {name}\n\nCAIAO project.\n")
    print(f"Project '{name}' created at {target_dir}")


def _cmd_new(args: list[str]):
    if len(args) < 2 or args[0] != "server":
        print("Usage: caiao new server <name> [--kind atomic-mcp|composite]")
        return
    name = args[1]
    kind = "atomic-mcp"
    for a in args[2:]:
        if a.startswith("--kind="):
            kind = a.split("=", 1)[1]
    target_dir = os.path.join(os.getcwd(), "servers", name)
    if os.path.exists(target_dir):
        print(f"Error: '{target_dir}' already exists")
        return
    os.makedirs(target_dir, exist_ok=True)
    _write_server_template(target_dir, name, kind)
    print(f"Server '{name}' created at {target_dir}")


def _cmd_validate():
    servers_dir = os.path.join(os.getcwd(), "servers")
    if not os.path.isdir(servers_dir):
        print("No 'servers/' directory found")
        return
    try:
        import yaml
    except ImportError:
        print("PyYAML not available. Install it: pip install pyyaml")
        return

    valid = 0
    invalid = 0
    for entry in sorted(os.scandir(servers_dir), key=lambda e: e.name):
        if not entry.is_dir() or entry.name.startswith("_") or entry.name.startswith("."):
            continue
        manifest = os.path.join(entry.path, "caiao.yaml")
        if not os.path.exists(manifest):
            print(f"  {entry.name}: MISSING caiao.yaml")
            invalid += 1
            continue
        try:
            with open(manifest, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            name = data.get("name", "?")
            kind = data.get("kind", "atomic-mcp")
            tools = len(data.get("tools", []))
            status = data.get("status", "?")
            print(f"  {entry.name}: OK (name={name}, kind={kind}, tools={tools}, status={status})")
            valid += 1
        except Exception as e:
            print(f"  {entry.name}: ERROR ({e})")
            invalid += 1
    print(f"\n{valid} valid, {invalid} invalid")


def _cmd_list():
    servers_dir = os.path.join(os.getcwd(), "servers")
    if not os.path.isdir(servers_dir):
        print("No 'servers/' directory found")
        return
    try:
        import yaml
    except ImportError:
        print("PyYAML not available")
        return

    rows = []
    for entry in sorted(os.scandir(servers_dir), key=lambda e: e.name):
        if not entry.is_dir() or entry.name.startswith("_") or entry.name.startswith("."):
            continue
        manifest = os.path.join(entry.path, "caiao.yaml")
        if os.path.exists(manifest):
            with open(manifest, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            rows.append({
                "name": data.get("name", entry.name),
                "kind": data.get("kind", "atomic-mcp"),
                "version": data.get("version", "?"),
                "status": data.get("status", "?"),
                "tools": len(data.get("tools", [])),
                "start_mode": data.get("start_mode", "eager"),
            })
    if not rows:
        print("No servers found")
        return
    print(f"{'Name':<35} {'Kind':<15} {'Version':<10} {'Status':<8} {'Tools':<6} {'Start'}")
    print("-" * 90)
    for r in rows:
        print(f"{r['name']:<35} {r['kind']:<15} {r['version']:<10} {r['status']:<8} {r['tools']:<6} {r['start_mode']}")


def _cmd_doctor():
    import platform
    print(f"Python: {sys.version}")
    print(f"Platform: {platform.system()} {platform.release()}")
    print(f"Executable: {sys.executable}")

    try:
        import mcp  # noqa: F401 — used to check availability
        print("MCP SDK: available")
    except ImportError:
        print("MCP SDK: NOT INSTALLED (pip install mcp)")

    cwd = os.getcwd()
    servers_dir = os.path.join(cwd, "servers")
    if os.path.isdir(servers_dir):
        count = len([
            e for e in os.scandir(servers_dir)
            if e.is_dir() and not e.name.startswith("_") and not e.name.startswith(".")
        ])
        print(f"Servers directory: {servers_dir} ({count} servers)")
    else:
        print(f"Servers directory: NOT FOUND (expected at {servers_dir})")


def _get_templates_dir() -> str:
    return os.path.join(os.path.dirname(__file__), "..", "templates")


def _copy_template(template_name: str, target_dir: str) -> None:
    src = os.path.join(_get_templates_dir(), template_name)
    if not os.path.isdir(src):
        print(f"Warning: template '{template_name}' not found at {src}")
        return
    _copy_dir(src, target_dir)


def _copy_dir(src: str, dst: str) -> None:
    os.makedirs(dst, exist_ok=True)
    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(dst, item)
        if os.path.isdir(s):
            _copy_dir(s, d)
        else:
            with open(s, "r", encoding="utf-8") as f:
                content = f.read()
            with open(d, "w", encoding="utf-8") as f:
                f.write(content)


def _write_server_template(target_dir: str, name: str, kind: str) -> None:
    from datetime import date
    src = os.path.join(_get_templates_dir(), "server")
    if not os.path.isdir(src):
        _write_server_template_inline(target_dir, name, kind)
        return
    for item in os.listdir(src):
        s = os.path.join(src, item)
        d = os.path.join(target_dir, item)
        if os.path.isdir(s):
            continue
        with open(s, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace("{{name}}", name)
        content = content.replace("{{kind}}", kind)
        content = content.replace("{{date}}", str(date.today()))
        with open(d, "w", encoding="utf-8") as f:
            f.write(content)


def _write_server_template_inline(target_dir: str, name: str, kind: str) -> None:
    server_py = os.path.join(target_dir, "server.py")
    template = '''"""CAIAO Server: {name}"""
import asyncio, json, logging
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
logging.basicConfig(level=logging.INFO, format="%(asctime)s [{name}] %(message)s")
logger = logging.getLogger("{name}")
server = Server("{name}")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [Tool(
        name="hello",
        description="A simple greeting tool",
        inputSchema={
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name to greet"},
            },
            "required": [],
        },
    )]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "hello":
        return [TextContent(type="text", text=json.dumps(
            {"greeting": "Hello, " + str(arguments.get("name", "world")) + "!"}))]
    return [TextContent(type="text", text=json.dumps({"error": "Unknown tool: " + str(name)}))]

async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
'''
    with open(server_py, "w", encoding="utf-8") as f:
        f.write(template.replace("{name}", name))

    caiao_yaml = os.path.join(target_dir, "caiao.yaml")
    with open(caiao_yaml, "w", encoding="utf-8") as f:
        f.write(f"""name: {name}
version: 1.0.3
kind: {kind}
description: "TODO: describe"
status: active
since: "{__import__('datetime').date.today()}"
start_mode: lazy
command:
  python: auto
  args: ["server.py"]
  cwd: "."
  env: {{}}
health:
  timeout_ms: 5000
  restart_on_crash: false
  max_restarts: 3
  health_check_interval_s: 0
tools:
  - name: hello
    description: "A simple greeting tool — replace with your own"
    tags: [example]
capabilities: [example]
dependencies:
  python: []
  system: []
""")


if __name__ == "__main__":
    main()
