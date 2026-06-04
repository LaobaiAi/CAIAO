---
level: ★
audience: overview
abstract: CAIAO 的定义、核心理念、品牌体系与关键概念速查
prerequisites: []
tags: [概念, 入门, 架构]
---

# CAIAO 概述

## 什么是 CAIAO

CAIAO 是一套独立的 Server 架构命名层，构建于工业标准 MCP（Model Context Protocol）SDK 之上。

核心公式：**CAIAO Server = MCP Server + 项目约定**

每一个 CAIAO Server 本质上是一个 MCP Server——Python 的 `mcp` 包负责 stdio 传输和 JSON-RPC 通信。我们重命名这一层抽象，是为了将项目自身的约定（命名规范、目录结构、生命周期管理、合并模式）与通用 MCP 协议区分开来。

## 核心哲学

```
一切都是 CAIAO Server。
LLM 通过 CAIAO Hub 与工具通信，绝不直接调用。
```

CAIAO Server 是系统中的最小原子单元，类比 LLM 的 token。就像 LLM 把 token 组合成意义一样，我们把 CAIAO Server 组合成工程工作流。

## CAIAO 的五个核心价值

### 隔离性
每个求解器运行在自己的子进程中。OpenSees 崩溃不会拖垮 PyNite。一个 Server 的故障不影响其他。

### 语言无关性
任何能进行 stdio JSON-RPC 通信的语言都可以成为 CAIAO Server。Python、C++、Rust、Julia——都可以。

### 即插即用
添加一个求解器只需写一个文件并注册。Gateway 核心代码零改动。

### AI 原生
每个工具的描述和 JSON Schema 都完整到 LLM 可以直接发现和调用。不需要硬编码路由。

### 面向未来
想要 GPU 加速求解器？写一个 CAIAO Server 来启动 CUDA 进程，完成。

## CAIAO 品牌：四象 AI 体系

CAIAO 是 **XuanwuAI（玄武）** 品牌下的架构层。玄武在四象 AI 家族中代表「水」元素——渊默之算（Abyssal Computation）——深层计算和策略决策。

| 神祇 | 元素 | 美德 | 领域 |
|------|------|------|------|
| QinglongAI 青龙 | 木 | 创生之智 | 生成式 AI |
| ZhuqueAI 朱雀 | 火 | 燎原之火 | 智能交互 |
| BaihuAI 白虎 | 金 | 肃金之盾 | AI 安全 |
| **XuanwuAI 玄武** | **水** | **渊默之算** | **复杂仿真、策略决策** |

## 关键概念速查

| 概念 | 定义 | 在哪 |
|------|------|------|
| CAIAO Server | 最小原子单元，独立子进程，暴露工具 | `servers/<name>/server.py` |
| CAIAO Client Hub | 多 Server 生命周期管理器，工具路由器 | 网关 Hub 模块（MCP 实现）或独立 Hub 模块（轻量实现） |
| caiao.yaml | Server 声明清单，描述身份、工具、依赖 | 每个 Server 目录下 |
| Tool | Server 暴露的能力单元，有名字、描述、JSON Schema | `@tool` 装饰器（轻量）或 `types.Tool`（MCP） |
| Merge Server | 合并多个原子 Server 逻辑的新 Server，含零领域逻辑 | `pipeline_server_a` |
| Composite | 声明式管线，Hub 内部调度，无子进程 | `run_full_workflow` |
| Infrastructure Server | 非功能环境提供者，解析和验证共享运行时 | `env_server` |

## 命名规范

| 上下文 | 规范 | 示例 |
|--------|------|------|
| 类名 | `CAIAO` + PascalCase | `CAIAOClientHub` |
| 常量 | `CAIAO_` + UPPER_SNAKE | `CAIAO_SERVERS_DIR` |
| 文件名 | `caiao_` + 小写 | `hub.py` |
| 目录 | `servers/` | `servers/<server_name>/` |
| SDK 导入 | 保持 `from mcp.server import Server` | 外部包，不重命名 |
| 工具名 | `snake_case` | `quick_analysis`, `analyze_frame` |
