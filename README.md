<p align="center">
  <img src="https://img.shields.io/badge/CAIAO-v0.1.0-1a1a2e?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjx0ZXh0IHg9IjEyIiB5PSIxNyIgdGV4dC1hbmNvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSI+4p2kPC90ZXh0Pjwvc3ZnPg==">
  <img src="https://img.shields.io/badge/python-%E2%89%A53.11-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/license-MIT-97ca00?style=for-the-badge">
  <img src="https://img.shields.io/badge/MCP-1.0%2B-ff6b6b?style=for-the-badge">
</p>

<p align="center">
  <samp>Every solver is an independent Server · Hub auto-discovers and routes · Framework is removable, Servers are not</samp>
</p>

<p align="center">
  <a href="#-四象-four-symbols-ai-system"><b>四象</b></a>
  ·
  <a href="#-what-is-caiao"><b>What is CAIAO</b></a>
  ·
  <a href="#-quickstart"><b>Quickstart</b></a>
  ·
  <a href="#-two-paths"><b>Two Paths</b></a>
  ·
  <a href="#-philosophy"><b>Philosophy</b></a>
  ·
  <a href="#-documentation"><b>Docs</b></a>
  ·
  <a href="README_CN.md"><b>📖 中文 →</b></a>
</p>

---

<h2 align="center">🐢 四象 · Four Symbols AI System</h2>

<p align="center">
  <b>CAIAO</b> is the <b>Black Tortoise (玄武)</b> of the Four Symbols AI System —<br>
  <i>abyssal computation, bearing complex analysis</i>.
</p>

```
四象 AI · Four Symbols AI System
├── 🐉 青龙 QinglongAI  ·  Wood  (木)  ·  Benevolence   (仁)  ·  Generation & Creation
├── 🦚 朱雀 ZhuqueAI    ·  Fire  (火)  ·  Propriety     (礼)  ·  Interaction & Dialogue
├── 🐅 白虎 BaihuAI     ·  Metal (金)  ·  Righteousness (义)  ·  Decision & Optimization
└── 🐢 玄武 XuanwuAI    ·  Water (水)  ·  Wisdom        (智)  ·  Abyssal Computation
                                                                    └─  CAIAO — here
```

CAIAO inherits the nature of the **Black Tortoise** — *still, deep, unshakable*. Each Server process is isolated like the tortoise's shell, while the Hub navigates between them like a serpent. The framework stays minimal — your domain logic is the true body.

> **"渊默之算" (Abyssal Computation)** — *No clamor, no fanfare. It computes in the depths and delivers answers at the critical moment.*

---

## 🐢 What is CAIAO

<a href="docs/01-core-concepts/CAIAO概述.md"><b>什么是CAIAO →</b></a>

**CAIAO** is a Server-as-atomic-unit framework for tool orchestration.

Your project has a set of solvers, tools, and external capabilities — structural analysis, physics simulation, AI inference, 3D rendering. Each is a **CAIAO Server**: an independent process communicating with the **Hub** via stdio. The Hub handles discovery, routing, and lifecycle management. Adding a new capability = writing one Server file + registering it — zero changes to core code.

```
                            ┌──────────────────────────────────┐
                            │             CAIAO Hub            │
                            │   discover · route · lifecycle   │
                            └────┬────────────┬───────────┬────┘
                                │            │           │
                            ┌────▼───┐  ┌─────▼────┐  ┌───▼────┐
                            │ Solver │  │ Renderer │  │ GenAI  │
                            │ Server │  │  Server  │  │ Server │
                            └────────┘  └──────────┘  └────────┘
                              stdio         stdio        stdio
                            (独立进程)    (独立进程)    (独立进程)
```

**Servers are fully isolated** — one crash never affects another. **The framework does not bind Servers** — every Server is a standard MCP Server, importing from `mcp.server`, not from `caiao`. Don't want the framework? Uninstall it. Your Servers keep running.

---

## ⚡ Quickstart

<a href="docs/02-two-implementations/轻量实现（钢框架设计）.md"><b>⚡ 快速开始 →</b></a>

### Lightweight Path — 3 files, zero install, 10 lines

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
hub.call_tool("add", {"a": 3, "b": 4})  # → {"result": 7}
```

### MCP SDK Path — install from GitHub, CLI project scaffolding

```bash
pip install "git+https://github.com/LaobaiAi/CAIAO.git#subdirectory=caiao"
caiao init my-project
cd my-project && caiao new server my-solver
```

---

## 🔀 Two Paths

<a href="docs/02-two-implementations/适用场景对比与选择指南.md"><b>🔀 两种路径对比 →</b></a>

|                     | MCP SDK                               | Lightweight                          |
| ------------------- | ------------------------------------- | ------------------------------------ |
| **Get it**          | `pip install "git+https://github.com/LaobaiAi/CAIAO.git#subdirectory=caiao"` | Copy `server.py` `hub.py` `subprocess.py` |
| **Dependencies**    | `mcp>=1.0.0`                          | Python stdlib only                   |
| **Mode**            | Async · `asyncio` full lifecycle      | Sync · in-process or subprocess      |
| **Best for**        | Production platforms, team projects, AI ecosystem | Embedded Python · Prototypes · CLI tools |

**Lightweight is not a simplified version — it is an independent architectural choice.** Start lightweight; switch to MCP SDK when AI ecosystem interoperability is needed — replace 10 lines of communication code, zero changes to business logic.

---

## 🧠 Philosophy

<a href="docs/01-core-concepts/核心设计原则.md"><b>🧠 设计哲学 →</b></a>

```
Server = Smallest Deployable Unit
├── Independent process, crash isolation
├── Zero transitive dependencies, only depends on mcp.server
├── Stateless: input → compute → output
└── Composable: frequent call sequences → merge into a new Server (original untouched)

Hub = Orchestration layer, not a dependency
├── Auto-discovery (caiao.yaml)
├── Lazy start (spawn on demand)
├── Semantic routing (fuzzy tool name matching)
└── Removable at any time — Servers unaffected
```

**Four core principles:** Server independence · Atomic unit · Merge without modification · Extract shared logic by ROI

---

## 📚 Documentation

<a href="docs/README.md"><b>📚 完整文档库 →</b></a>

Full Chinese knowledge base → [`docs/`](docs/README.md) · AI-readable index → [`MANIFEST.yaml`](docs/MANIFEST.yaml)

| Section | Content |
|---------|---------|
| [01 — Core Concepts](docs/01-core-concepts/) <a href="docs/01-core-concepts/CAIAO概述.md"><sub>核心概念</sub></a> | What is CAIAO · Relationship with MCP · Design principles |
| [02 — Two Implementations](docs/02-two-implementations/) <a href="docs/02-two-implementations/适用场景对比与选择指南.md"><sub>两种实现</sub></a> | MCP SDK vs Lightweight · Selection guide · Unique advantages |
| [03 — Server Catalog](docs/03-server-catalog/) <a href="docs/03-server-catalog/全部Server清单.md"><sub>Server目录</sub></a> | Server types · Design patterns · Reusable code patterns |
| [04 — caiao.yaml System](docs/04-caiao-yaml-system/) <a href="docs/04-caiao-yaml-system/清单规范.md"><sub>清单系统</sub></a> | Declarative manifest specification |
| [05 — Dev Guides](docs/05-dev-guides/) <a href="docs/05-dev-guides/创建MCP-Server.md"><sub>开发指南</sub></a> | Creating Servers · Distillation methodology · Frontend integration · System Prompt design |
| [06 — Iron-Fall Reference](docs/06-iron-fall-reference/) <a href="docs/06-iron-fall-reference/项目概述.md"><sub>迁移参考</sub></a> | Migration case study · Distillation source · Migration paths |
| [07 — Protocol Reference](docs/07-protocol-reference/) <a href="docs/07-protocol-reference/CAIAO-Server规范v1.0-正式版.md"><sub>协议参考</sub></a> | Specification v1.0 · stdio protocol · Contract rules |
| [08 — Evolution History](docs/08-evolution-history/) <a href="docs/08-evolution-history/版本演进.md"><sub>演进历史</sub></a> | Design evolution · Key decisions · Merge roadmap |
| [09 — Critique & Reflection](docs/09-critique-and-reflection/) <a href="docs/09-critique-and-reflection/反思与改进方向.md"><sub>批判与反思</sub></a> | Known limitations · Design reflections · Code review framework |
| [10 — Operations Manual](docs/10-operations-manual/) <a href="docs/10-operations-manual/Server合并完整操作指南.md"><sub>操作手册</sub></a> | Merge · Test · Debug · Review · Absorb · **Exit mechanism** |

---

## 🛡️ Exit Mechanism

<a href="docs/10-operations-manual/CAIAO退场机制.md"><b>🛡️ 退场机制 →</b></a>

CAIAO is designed to be **fully removable**. Every Server imports from `mcp.server`, not from `caiao`. Uninstall the framework → replace Hub calls with direct MCP Sessions → your Servers run unchanged. See [`退场机制`](docs/10-operations-manual/CAIAO退场机制.md) for details.

---

## 📦 Repository

```
CAIAO/
├── caiao/                 MCP SDK package
├── caiao_lightweight/     Zero-dependency, 3 files copy-and-run
├── docs/                  Full knowledge base (中文)
├── README.md              English
└── README_CN.md           中文
```

### Requirements

- Python ≥ 3.11
- MCP SDK path: `pip install mcp`
- Lightweight path: Python stdlib only

### License

MIT · [LaobaiAi/CAIAO](https://github.com/LaobaiAi/CAIAO)
