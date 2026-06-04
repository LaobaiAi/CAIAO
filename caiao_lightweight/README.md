# CAIAO Lightweight

Zero-dependency CAIAO implementation. Copy these files into any project — no pip install, no `mcp` package, no external dependencies at all.

Designed for:
- Embedded Python environments (Abaqus, Blender, Rhino, etc.)
- Quick prototypes and demos
- CLI tools that need tool orchestration
- Projects with strict dependency policies

## Files

| File | Lines | Purpose |
|------|:---:|---------|
| `server.py` | ~110 | `CAIAOServer` base class + `@tool` decorator. Subclass to create Servers. |
| `hub.py` | ~100 | `Hub` — synchronous multi-server manager. In-process or subprocess mode. |
| `subprocess.py` | ~90 | `SubprocessManager` — JSON-line stdio protocol for subprocess Servers. |

## Quickstart

```python
# 1. Copy these 3 files into your project

# 2. Write a Server
from server import CAIAOServer, tool

class Calculator(CAIAOServer):
    name = "calculator"
    description = "Simple math"

    @tool
    def add(self, args: dict) -> dict:
        return {"result": args["a"] + args["b"]}

    @tool
    def multiply(self, args: dict) -> dict:
        return {"result": args["a"] * args["b"]}

# 3. Use it
from hub import Hub

hub = Hub()
hub.register(Calculator())
result = hub.call_tool("add", {"a": 3, "b": 4})
print(result)  # {"result": 7}
```

## Two modes

**In-process** (default): Server runs in the same process, direct function calls, zero overhead. Best for development and orchestration.

**Subprocess**: Server runs as a separate process with JSON-line stdio protocol. Best for isolation, crash safety, and multi-language support.

```python
hub.register_subprocess("calc", ["python", "calculator.py"])
result = hub.call_tool("add", {"a": 3, "b": 4})  # subprocess auto-spawned
```

## CLI mode

Every `CAIAOServer` subclass doubles as a CLI:

```bash
python calculator.py list_tools  # Print all tools as JSON
python calculator.py call_tool add '{"a":3,"b":4}'  # Call a tool
python calculator.py metadata  # Print server metadata
```

## Upgrade path to MCP SDK

When you need async support, AI ecosystem interoperability, or full lifecycle management, switch to the MCP SDK path. Replace your Server's base class and ~10 lines of communication code. Your `@tool` business logic stays unchanged.
