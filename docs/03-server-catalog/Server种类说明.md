---
level: ★★
audience: developer
abstract: CAIAO Server 三种类的详细说明与使用场景
prerequisites: [全部Server清单.md]
tags: [Server种类, infrastructure, composite]
---

# CAIAO Server 种类说明

## 三种 Server 种类

CAIAO 协议定义了三种 Server 种类，在 `caiao.yaml` 的 `kind` 字段中声明：

| 种类 | 用途 | 启动模式 | 子进程 | 示例 |
|------|------|---------|--------|------|
| `atomic-mcp` | 标准 MCP Server，独立、单一职责 | lazy（默认）或 eager | 是 | `solver_server`, `functional_server` |
| `composite` | 声明式管线，通过 Hub 串联其他 Server 工具 | — | 否（Hub 内部） | `run_workflow`, `pipeline_workflow` |
| `infrastructure` | 非功能环境提供者，解析和验证共享运行时 | eager | 是 | `env_server`, `runtime_env_server` |

## 轻量实现中的 Server 分类

轻量实现（实现 B）没有 `kind` 字段，但通过类属性区分：

| 属性 | 值 | 含义 |
|------|-----|------|
| `server_type` | `"orchestration"` | 编排型——主进程内安全运行，不需隔离 |
| `server_type` | `"computational"` | 计算型——建议独立子进程运行，崩溃不牵连 |
| `_caiao_subprocess` | `True` | Hub 自动扫描时跳过，需手动通过 `register_subprocess()` 注册 |

## 原子 Server vs 合并 Server

| | 原子 Server | 合并 Server（Pipeline） |
|---|---|---|
| **定义** | 独立计算逻辑，单一领域功能 | 编排多个原子 Server，自己不含计算逻辑 |
| **示例** | `generate_data`, `run_analysis` | `run_full_pipeline`, `execute_with_llm` |
| **依赖** | 不 import 其他 Server | 通过 Hub 调用其他 Server |
| **运行模式** | 任意（进程内或子进程） | 仅进程内（纯编排，无计算，无需隔离） |

## Infrastructure Server 详解

Infrastructure Server 是 CAIAO 最新的 Server 种类，解决「隐藏共享依赖」问题——当多个功能 Server 都依赖同一个外部运行时时（如 Blender、CUDA、特定 Python venv），将该依赖建模为显式 Server。

### 核心属性

- **Eager 启动**：在任何依赖它的功能 Server 之前启动。如果 infrastructure server 健康检查失败，所有依赖者被阻止，输出清晰的错误信息。
- **只读工具**：`resolve_*`、`validate_*`、`provide_*`——无副作用，无重计算。
- **声明式依赖**：功能 Server 在其 `caiao.yaml` 中声明 `depends_on: servers: [<infra_server>]`。Hub 在启动时解析依赖图。
- **环境注入**：Hub 调用 infrastructure server 的工具获取路径/配置，然后注入到依赖 Server 的启动环境变量中。

### 运作流程

以 `env_server` 为例：

1. Hub 加载 `functional_server` 配置时，检测到 `depends_on: servers: [env_server]`
2. 先启动 `env_server`（eager）
3. 调用 `resolve_runtime_path` → 注入 `RUNTIME_EXE` 环境变量
4. 调用 `provide_workspace_paths` → 注入 `SCRIPTS_DIR`、`DATA_DIR`
5. 调用 `validate_environment` → 如果检查失败，跳过启动功能 Server，报告原因
6. 启动 `functional_server`，携带注入的环境

如果运行时环境有问题，Hub 在 infrastructure 层报告一次，而非收到多条「Runtime not found」错误。

## Composite（复合管线）

是一种特殊的 Server——它在 Hub 内部运行，没有自己的子进程。使用声明式配置：

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
  - server: solver_server
    tool: select_critical
    input_map:
      data_model: data_model
      analysis_result: analysis
    map_result: critical_item
```

Hub 自动将其注册为本地处理器，按顺序执行步骤，在步骤间传递上下文。当某个步骤返回错误时，管线在该步骤停止，返回状态和部分上下文。

## Server 的三种运行方式

| 方式 | 命令 | 适用场景 |
|------|------|----------|
| **直接调用** | `server = MyServer(); server.call_tool(...)` | 代码内编排、测试 |
| **CLI 模式** | `python my_server.py tool_name '{"key":"val"}'` | 调试、手工验证 |
| **stdio 循环** | `python -u my_server.py` | 子进程模式、MCP 集成 |
