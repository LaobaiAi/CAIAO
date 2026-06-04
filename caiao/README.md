# CAIAO

**Server-as-atomic-unit framework for tool orchestration.**

CAIAO turns every solver, tool, or external capability into an independent Server process. The Hub discovers, routes, and manages them. Add a new capability by writing one Server file and registering it — no core code changes.

---

## Two paths, same contract

| | MCP SDK Path | Lightweight Path |
|---|---|---|
| **What** | `pip install caiao` | Copy 3 files into your project |
| **Dependencies** | `mcp>=1.0.0` | Python stdlib only |
| **Async** | Full asyncio lifecycle | Synchronous, in-process or subprocess |
| **Best for** | Production platforms, team projects, AI ecosystem | Embedded Python (Abaqus/Blender), prototypes, CLI tools |
| **Upgrade path** | — | Replace ~10 lines to switch to MCP SDK |

---

## Quickstart (MCP SDK path)

```bash
pip install caiao
```

```python
from caiao import CAIAOClientHub
from caiao.discovery import discover_server_configs

configs = discover_server_configs(servers_dir="./servers")
hub = CAIAOClientHub(configs)
await hub.start_all()
result = await hub.call_tool("my_tool", {"param": "value"})
```

Create a new project:
```bash
caiao init my-project
cd my-project
caiao new server my-solver
# → servers/my-solver/server.py + caiao.yaml
```

---

## Quickstart (Lightweight path)

Copy `caiao_lightweight/server.py`, `hub.py`, `subprocess.py` into your project.

```python
from server import CAIAOServer, tool
from hub import Hub

class MyServer(CAIAOServer):
    name = "my_server"

    @tool
    def greet(self, args: dict) -> dict:
        return {"hello": args.get("name", "world")}

hub = Hub()
hub.register(MyServer())
result = hub.call_tool("greet", {"name": "CAIAO"})
```

---

## Project structure (after `caiao init`)

```
my-project/
├── servers/                # All CAIAO Servers live here
│   └── my-solver/
│       ├── server.py       # MCP Server with list_tools/call_tool
│       └── caiao.yaml      # Declarative manifest
├── gateway/                # Application entry point (optional)
│   └── main.py             # Hub initialization + API
├── caiao/                  # (lightweight only) Framework files
├── caiao.yaml              # Project-level config
└── requirements.txt
```

---

## CLI commands

```
caiao init <name>            Create a new CAIAO project
  --lightweight              Use zero-dependency lightweight path
caiao new server <name>      Scaffold a new Server
  --kind atomic-mcp          Default: standard Server
  --kind composite           Pipeline orchestration Server
caiao validate               Validate all caiao.yaml manifests
caiao list                   List all Servers with status
caiao doctor                 Check environment (Python, MCP SDK, etc.)
```

---

## How it works

```
User → Application → Hub.call_tool("analyze", {...})
                         │
                         ├─→ Local handler? ──→ Execute in-process
                         ├─→ Tool registry? ──→ Route to Server subprocess
                         ├─→ Lazy? ───────────→ Start Server on-demand
                         └─→ Not found? ──────→ Semantic fuzzy match
```

Each Server is an independent process communicating via stdio JSON-RPC (MCP protocol). The Hub manages the full lifecycle: start, stop, restart, health check, metrics.

---

## Exit mechanism

CAIAO is designed to be removable. Your Servers are standard MCP servers — they import from `mcp.server`, not from `caiao`.

To remove CAIAO:
1. `pip uninstall caiao` (or delete `caiao_lightweight/` directory)
2. Replace Hub calls in your application with direct MCP Session connections
3. Your Servers continue to work unchanged — each is a standalone MCP server

No server code changes required. The framework is a convenience layer, not a hard dependency.

---

## Documentation

Full documentation at `caiao-knowledge-base/` (this repository):
- Core concepts and design principles
- Server patterns and reusable code patterns
- Development guides for both implementation paths
- Protocol specification v1.0
- Operations manuals (merge, test, review, absorb)

---

## Requirements

- Python >= 3.11
- MCP SDK path: `pip install mcp`
- Lightweight path: Python stdlib only
