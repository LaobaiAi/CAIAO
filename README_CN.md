<p align="center">
  <img src="https://img.shields.io/badge/CAIAO-v0.1.0-1a1a2e?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjx0ZXh0IHg9IjEyIiB5PSIxNyIgdGV4dC1hbmNvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSI+4p2kPC90ZXh0Pjwvc3ZnPg==">
  <img src="https://img.shields.io/badge/python-%E2%89%A53.11-3776AB?style=for-the-badge&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/license-MIT-97ca00?style=for-the-badge">
  <img src="https://img.shields.io/badge/MCP-1.0%2B-ff6b6b?style=for-the-badge">
</p>

<p align="center">
  <samp>每个求解器都是一个独立的 Server · Hub 自动发现与路由 · 框架可随时移除，Server 不受影响</samp>
</p>

<p align="center">
  <a href="README.md"><b>🌐 English →</b></a>
  ·
  <a href="#-四象-ai-体系"><b>四象</b></a>
  ·
  <a href="#-什么是-caiao"><b>什么是 CAIAO</b></a>
  ·
  <a href="#-快速开始"><b>快速开始</b></a>
  ·
  <a href="#-两种路径"><b>两种路径</b></a>
  ·
  <a href="#-设计哲学"><b>设计哲学</b></a>
  ·
  <a href="#-文档"><b>文档</b></a>
  ·
  <a href="docs/README.md"><b>📖 完整知识库</b></a>
</p>

---

<h2 align="center">🐢 四象 AI 体系</h2>

<p align="center">
  <b>CAIAO</b> 是<b>四象 AI 体系</b>的玄武之器 —<br>
  <i>渊默之算，承载复杂分析</i>.
</p>

```
四象 AI · Four Symbols AI System
├── 🐉 青龙 QinglongAI   ·  木  ·  仁  ·  生成与创作
├── 🦚 朱雀 ZhuqueAI     ·  火  ·  礼  ·  交互与对话
├── 🐅 白虎 BaihuAI      ·  金  ·  义  ·  决策与优化
└── 🐢 玄武 XuanwuAI     ·  水  ·  智  ·  渊默之算
                                             └─  CAIAO — 在此
```

CAIAO 继承玄武的特性——**沉静、深邃、不可动摇**。Server 进程像龟甲般独立隔离，Hub 如灵蛇般在 Server 之间穿行调度。框架本身保持最小体量，让使用者的领域能力成为主体。

> **"渊默之算"** — 不喧哗，不浮夸，在深处运行，在关键时刻给出答案。

---

## 🐢 什么是 CAIAO

<a href="docs/01-core-concepts/CAIAO概述.md"><b>什么是CAIAO →</b></a>

**CAIAO** 是一个 Server 即原子单元的工具编排框架。

你的项目里有一堆求解器、工具、外部能力——结构分析、物理模拟、AI 推理、3D 渲染。每个都是一个 **CAIAO Server**，一个独立的进程，通过 stdio 与 **Hub** 通信。Hub 负责发现、路由、生命周期管理。加一个新能力 = 写一个 Server 文件 + 注册，核心代码零改动。

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

**Server 之间完全隔离**——一个崩溃不影响其他。**框架不绑定 Server**——每个 Server 是标准 MCP Server，从 `mcp.server` 导入，不从 `caiao` 导入。不想要框架了？卸载它，你的 Server 继续工作。

---

## ⚡ 快速开始

<a href="docs/02-two-implementations/轻量实现（钢框架设计）.md"><b>⚡ 快速开始 →</b></a>

### 轻量路径 — 复制三个文件，零安装，十行代码跑起来

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

### MCP SDK 路径 — 从 GitHub 安装，CLI 生成项目骨架

```bash
pip install "git+https://github.com/LaobaiAi/CAIAO.git#subdirectory=caiao"
caiao init my-project
cd my-project && caiao new server my-solver
```

---

## 🔀 两种路径

<a href="docs/02-two-implementations/适用场景对比与选择指南.md"><b>🔀 两种路径对比 →</b></a>

|                     | MCP SDK                               | Lightweight                          |
| ------------------- | ------------------------------------- | ------------------------------------ |
| **获取**            | `pip install "git+https://github.com/LaobaiAi/CAIAO.git#subdirectory=caiao"` | 复制 `server.py` `hub.py` `subprocess.py` |
| **依赖**            | `mcp>=1.0.0`                          | Python 标准库                        |
| **模式**            | 异步 · `asyncio` 完整生命周期         | 同步 · 进程内直调或子进程            |
| **适用**            | 生产平台 · 团队协作 · AI 生态互通     | 嵌入式 Python · 原型 · CLI 工具      |

**轻量不是简化版，是独立的架构选择。** 先轻量起步，需要 AI 生态互通时切换到 MCP SDK——换 10 行通信代码，业务逻辑零改动。

---

## 🧠 设计哲学

<a href="docs/01-core-concepts/核心设计原则.md"><b>🧠 设计哲学 →</b></a>

```
Server = 最小可部署单元
├── 独立进程，崩溃隔离
├── 零间接依赖，仅依赖 mcp.server
├── 无状态：输入 → 计算 → 输出
└── 可组合：高频调用序列 → 合并为新 Server（不修改源 Server）

Hub = 编排层，不是依赖
├── 自动发现（caiao.yaml）
├── 惰性启动（按需 spawn）
├── 语义路由（工具名模糊匹配）
└── 可随时移除，Server 不受影响
```

**四项核心原则：** Server 独立性 · 原子单元 · 合并不修改 · 按 ROI 提取共享逻辑

---

## 📚 文档

<a href="docs/README.md"><b>📚 完整文档库 →</b></a>

AI 可读索引 → [`MANIFEST.yaml`](docs/MANIFEST.yaml)

| 章节 | 内容 |
|------|------|
| [01 — 核心概念](docs/01-core-concepts/) | CAIAO 是什么 · 与 MCP 的关系 · 设计原则 |
| [02 — 两种实现](docs/02-two-implementations/) | MCP SDK vs 轻量 · 选择指南 · 独特优势 |
| [03 — Server 目录](docs/03-server-catalog/) | Server 种类 · 设计模式 · 可复用代码模式 |
| [04 — caiao.yaml 系统](docs/04-caiao-yaml-system/) | 声明式清单规范 |
| [05 — 开发指南](docs/05-dev-guides/) | 创建 Server · 蒸馏方法论 · 前端集成 · System Prompt 设计 |
| [06 — Iron-Fall 迁移参考](docs/06-iron-fall-reference/) | 迁移案例 · 蒸馏源参考 · 迁移路径 |
| [07 — 协议参考](docs/07-protocol-reference/) | 规范 v1.0 · stdio 协议 · 契约规则 |
| [08 — 演进历史](docs/08-evolution-history/) | 设计演进 · 关键决策 · 合并路线图 |
| [09 — 批判与反思](docs/09-critique-and-reflection/) | 已知局限 · 设计反思 · 代码审查框架 |
| [10 — 操作手册](docs/10-operations-manual/) | 合并 · 测试 · 调试 · 审查 · 吸收 · **退场机制** |

---

## 🛡️ 退场机制

<a href="docs/10-operations-manual/CAIAO退场机制.md"><b>🛡️ 退场机制 →</b></a>

CAIAO 设计为**可随时移除**。每个 Server 从 `mcp.server` 导入，不从 `caiao` 导入。卸载框架 → 替换 Hub 调用为直接 MCP Session → Server 零改动继续运行。详见 [`退场机制`](docs/10-operations-manual/CAIAO退场机制.md)。

---

## 📦 仓库

```
CAIAO/
├── caiao/                 MCP SDK 包
├── caiao_lightweight/     零依赖 · 三文件复制即用
├── docs/                  完整知识库
├── README.md              English
└── README_CN.md           ← 你在这里
```

### 环境要求

- Python ≥ 3.11
- MCP SDK 路径：`pip install mcp`
- 轻量路径：纯标准库

### 许可证

MIT · [LaobaiAi/CAIAO](https://github.com/LaobaiAi/CAIAO)
