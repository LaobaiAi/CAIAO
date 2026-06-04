<p align="center">
  <picture>
    <img alt="CAIAO" src="https://img.shields.io/badge/CAIAO-v0.1.0-333?style=for-the-badge">
  </picture>
</p>

<p align="center">
  <strong>Server-as-Atomic-Unit Framework for Tool Orchestration</strong>
</p>

<p align="center">
  <a href="#quickstart"><strong>Quickstart</strong></a> ·
  <a href="docs/"><strong>Documentation</strong></a> ·
  <a href="caiao/"><strong>MCP SDK</strong></a> ·
  <a href="caiao_lightweight/"><strong>Lightweight</strong></a>
</p>

---

**CAIAO** turns every tool, solver, or external capability into an independent Server process. A central Hub discovers, routes, and manages them. Add a new capability by writing one Server file and registering it — zero core code changes.

```
Application → Hub.call_tool("analyze", {…})
                 ├─ Local handler?    → In-process execution
                 ├─ Tool registry?    → Route to Server subprocess
                 ├─ Server is lazy?   → Spawn on-demand
                 └─ Tool not found?   → Semantic fuzzy match
```

### Two Paths, Same Contract

|  | MCP SDK | Lightweight |
|---|---|---|
| **Get it** | `pip install -e ./caiao` | Copy 3 files into your project |
| **Dependencies** | `mcp>=1.0.0` | Python stdlib only |
| **Async** | Full `asyncio` lifecycle | Synchronous |
| **Best for** | Platforms, team projects, AI ecosystems | Embedded Python, prototypes, CLI tools |

### Quickstart

**Lightweight** — copy three files, zero install:

```python
from server import CAIAOServer, tool
from hub import Hub

class Calculator(CAIAOServer):
    name = "calculator"

    @tool
    def add(self, args: dict) -> dict:
        return {"result": args["a"] + args["b"]}

hub = Hub()
hub.register(Calculator())
hub.call_tool("add", {"a": 3, "b": 4})  # {"result": 7}
```

**MCP SDK** — scaffold a new project in seconds:

```bash
pip install -e ./caiao
caiao init my-project
cd my-project && caiao new server my-solver
```

### Server Contract

Every CAIAO Server is a standard MCP Server. Framework code never touches your business logic:

```python
from mcp.server import Server, stdio_server
from mcp.types import Tool, TextContent
import asyncio, json

server = Server("my-solver")

@server.list_tools()
async def list_tools():
    return [Tool(name="solve", description="Run solver", inputSchema={})]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    return [TextContent(type="text", text=json.dumps({"status": "ok"}))]

if __name__ == "__main__":
    async def main():
        async with stdio_server() as (read, write):
            await server.run(read, write, server.create_initialization_options())
    asyncio.run(main())
```

### Exit Is Designed In

CAIAO is a convenience layer, not a hard dependency. Every Server imports from `mcp.server`, never from `caiao`. To remove: uninstall the package (or delete the three lightweight files), replace Hub calls with direct MCP Session connections. Your Servers keep working — zero changes to server code.

### Project Philosophy

**Server = minimum deployable unit.** Each Server is self-contained, independently testable, and crash-isolated. Compose them like tokens — when a sequence of calls becomes frequent, merge them into a new Server without touching the originals.

**Copy or install. Synchronous or async. Embedded Python or full platform.** One framework, two implementations. Start lightweight, migrate to MCP SDK when you need AI ecosystem interoperability — replace ~10 lines of communication code.

### Repository Structure

```
├── caiao/                 MCP SDK package (pip install)
├── caiao_lightweight/     Zero-dependency path (copy 3 files)
│   ├── server.py          CAIAOServer + @tool decorator
│   ├── hub.py             Synchronous Hub (in-process + subprocess)
│   └── subprocess.py      JSON-line stdio subprocess manager
├── docs/                  Full documentation & knowledge base
│   ├── MANIFEST.yaml      AI-readable index
│   └── GOVERNANCE.md      Maintenance guide
└── README.md              This file
```

### Documentation

Full documentation in [`docs/`](docs/):
- **01-core-concepts** — What CAIAO is, design principles, relationship to MCP
- **02-two-implementations** — MCP SDK vs. lightweight, selection guide
- **03-server-catalog** — Server types, design patterns, reusable code patterns
- **04-caiao-yaml-system** — Declarative manifest specification
- **05-dev-guides** — Create servers, distillation methodology, frontend integration
- **07-protocol-reference** — Formal Server specification v1.0, stdio protocol, naming
- **09-critique-and-reflection** — Known limitations, design reflections, improvements
- **10-operations-manual** — Practical guides: merge, test, debug, review, absorb, exit

### Requirements

- Python ≥ 3.11
- MCP SDK path: `pip install mcp`
- Lightweight path: Python stdlib only

### License

MIT
