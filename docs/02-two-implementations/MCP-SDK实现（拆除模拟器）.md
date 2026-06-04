---
level: ★★
audience: developer
abstract: 基于 MCP SDK 的 CAIAO 完整实现模式——Hub 生命周期、自动发现、资源自适应并行、语义路由
abstract_en: Full MCP SDK implementation pattern - Hub lifecycle, auto-discovery, adaptive parallel resource management, semantic routing
prerequisites: [CAIAO概述.md]
tags: [MCP-SDK, 实现模式, Hub]
---

# MCP SDK CAIAO 实现模式

## 框架代码

MCP SDK 路径的框架代码位于 `caiao/` 包。获取方式：

```bash
pip install "git+https://github.com/LaobaiAi/CAIAO.git#subdirectory=caiao"
```

核心文件：`caiao/hub.py`（CAIAOClientHub）、`caiao/discovery.py`（清单发现）。完整说明见 `caiao/README.md`。

## 概述

这是 CAIAO 的 **MCP SDK 完整实现模式**，使用 Python `mcp>=1.0.0` SDK 作为底层传输层。所有 Server 都是标准的 MCP Server，通过 stdin/stdout JSON-RPC 与 Hub 通信。

## 核心组件

### Hub 实现（约数百行）

完整的异步多 Server 生命周期管理器：

- **自动发现**：通过 `caiao.yaml` 清单扫描 `servers/` 目录
- **工具注册表**：三层注册——本地处理器（无子进程）、运行中 Server、惰性 Server（静态配置）
- **惰性启动**：`lazy: True` 的 Server 在首次工具调用时 spawn
- **Composite 管线**：声明式 pipeline 配置，自动注册本地处理器
- **资源自适应并行**：检测 CPU 和系统负载，高负载自动回退串行
- **语义路由**：Jaccard 相似度 + n-gram 模糊匹配，工具名拼错时自动纠正
- **状态机 + 指标**：Server 状态追踪（registered/starting/running/crashed）、调用延迟统计
- **健康监控**：支持暂停、重启、停止单个 Server

### 自动发现系统（约数百行）

自动发现系统，替代硬编码的 SERVER_CONFIGS：

- 扫描 `servers/*/caiao.yaml` 清单文件
- 转换为 Hub 可用的 SERVER_CONFIGS 条目
- 支持 sentinel 值：可通过环境文件动态解析外部运行时路径
- 找不到清单时回退到硬编码的 legacy configs

## Server 契约

每个 Server 位于 `servers/<name>/server.py`，遵循以下骨架：

```
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

server = Server("<server-name>")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [Tool(name="my_tool", description="...", inputSchema={...})]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    result = {"status": "ok"}
    return [TextContent(type="text", text=json.dumps(result))]

async def main():
    async with stdio_server() as (read, write):
        await server.run(read, write, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

## Server 种类

| 种类 | 说明 | 启动模式 | 示例 |
|------|------|---------|------|
| `atomic-mcp` | 标准 MCP Server，独立、单一职责 | lazy（默认） | `solver_a` |
| `composite` | 声明式管线，通过 Hub 串联其他 Server 的工具。无子进程。 | —（Hub 内部） | `workflow_pipeline` |
| `infrastructure` | 非功能环境提供者。解析和验证共享运行时依赖（二进制、路径、配置）。暴露只读诊断工具。 | eager | `env_server` |

## 关键特性

### 惰性启动

通过 `SERVER_CONFIGS` 中的 `lazy: True` 配置。Server 不在 gateway 启动时 spawn——只在 LLM 首次请求其工具时才启动。适用于计算密集型求解器和大型运行时环境。

### 资源自适应并行

`call_tools_parallel()` 在执行前评估机器负载。CPU 超过 80% 或可用核心不足时自动回退串行执行。Linux 上通过 `/proc/loadavg` 检测，Windows 上保守限制并行数。

### 语义搜索

当精确工具名未找到时，Hub 对注册表中所有工具名和描述执行关键词 Jaccard 相似度搜索。超过阈值（0.20）时自动路由。例如 `analyz_data` → `analyze_data`。

### Composite 管线

声明式配置，无需写代码：

```
pipeline:
  - server: generator_server
    tool: generate_data
    map_result: data_model
  - server: solver_server
    tool: analyze_data
    input_map:
      data_model: data_model
    map_result: analysis
```

Hub 自动注册为本地处理器，按顺序执行步骤并传递上下文。

## 完整 Server 列表

详见「03-Server 完整目录」章节。涵盖基础设施、原子、合并、复合四种 Server，覆盖计算分析、数据建模、流程编排、可视化和 AI 集成等领域。
