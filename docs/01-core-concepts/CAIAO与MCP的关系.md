---
level: ★★
audience: developer
abstract: CAIAO 与 MCP 协议的分层关系、两种实现的详细对比、升级路径
prerequisites: [CAIAO概述.md]
tags: [MCP, 协议, 对比]
---

# CAIAO 与 MCP 的关系

## 分层架构

CAIAO 和 MCP 不是竞争关系，而是分层设计：

```
┌─────────────────────────────────┐
│    AI 助手（Claude Desktop 等）  │  ← 说 MCP "语言"
├─────────────────────────────────┤
│    MCP 协议层（stdio transport） │  ← 标准通信协议（AI 世界通用）
├─────────────────────────────────┤
│    CAIAO Server                 │  ← 项目内部架构
│    (list_tools / call_tool)     │     统一接口、自动注册、CLI 调试
└─────────────────────────────────┘
```

## 各层职责

| 层 | 是什么 | 在项目中的体现 |
|----|--------|---------------|
| **MCP SDK** | Python 包 `mcp>=1.0.0` | `from mcp.server import Server` |
| **MCP stdio transport** | stdin/stdout 上的 JSON-RPC | `stdio_server()` 处理序列化 |
| **CAIAO Server** | 项目自己的工具 Server 概念 | 每个 `servers/<name>/server.py` |
| **CAIAO Client Hub** | 多 Server 生命周期管理器 | 网关 Hub 模块 → Hub 实现类 |

## MCP SDK 是实现细节

开发者只需要遵循 CAIAO 契约。MCP SDK 是底层传输机制，对 Server 开发者透明。

## 两种实现的差异

| 方面 | 实现 A（MCP SDK） | 实现 B（轻量） |
|------|--------------------------|----------------------|
| 基础库 | `mcp>=1.0.0` | 纯 Python，零外部依赖 |
| 通信协议 | 标准 MCP JSON-RPC over stdio | 自研轻量 JSON-RPC over stdio |
| Server 基类 | MCP `Server` 实例 + 装饰器 | 自研 `CAIAOServer` 基类 + `@tool` |
| Hub 实现 | Hub 实现类（约数百行）异步，完整生命周期 | Hub 实现类（约数百行）同步，进程内/子进程双模 |
| 工具注册 | `@server.list_tools()` + `types.Tool` | `@tool(name, desc, schema)` 装饰器 |
| 进程管理 | `StdioServerParameters` + `ClientSession` | 子进程管理器（约百行） |
| 子进程启动 | 通过 `stdio_client()` | 通过 `subprocess.Popen` + JSON 行协议 |
| 资源自适应并行 | CPU 负载检测 + 自动回退串行 | 不支持（纯同步） |
| 惰性启动 | config `lazy: True` | config `lazy: True` |
| 语义路由 | Jaccard 相似度 + n-gram 模糊匹配 | 不支持 |
| 健康监控 | state machine + metrics tracking | 不支持 |
| Composite 管线 | 声明式 pipeline 配置，自动注册 | 需手动写 Pipeline Server |

## 为什么不做成纯 MCP Server

实现 B（轻量实现）特意没有直接用 MCP SDK，原因：

1. Pipeline 编排 5 个 Server 如果都要启子进程、走 stdio JSON-RPC，属于过度工程
2. CLI 调试如果每次都要起子进程，开发效率大幅下降
3. 当前阶段完全用不到 AI 直接调用，引入 MCP SDK 依赖无益
4. `run_stdio_loop()` 中的手写 JSON-RPC 循环本质是「协议质检垫脚石」——验证接口与 MCP 对齐，将来换 SDK transport 零业务逻辑改动

## 升级路径

从轻量 CAIAO 升级到完整 MCP SDK 的改动量：

| 组件 | 改动量 |
|------|--------|
| 业务 Server 的业务逻辑 | 零行 |
| `@tool` 装饰器 | 零行 |
| `list_tools()` | 零行 |
| `call_tool()` | 零行 |
| Pipeline 编排代码 | 零行 |
| CLI 入口 | 零行 |
| `run_stdio_loop()` 手写循环 | 替换为 MCP SDK transport（约百行 → 约数行） |

因为 `list_tools()` 输出格式与 MCP `tools/list` 兼容，`call_tool()` 语义与 MCP `tools/call` 一致——接口在 CAIAO 设计阶段就已对齐 MCP 标准。

## 何时需要 MCP

当外部 AI 客户端（如 Claude Desktop、CodeBuddy）需要直接调用你的工具时，才需要 MCP 协议。在此之前，CLI 模式和 Pipeline 进程内编排完全不需要。
