---
level: ★★
audience: developer
abstract: CAIAO Server 的 stdio 通信协议——MCP SDK 版本与轻量版本的 JSON-line 实现、子进程生命周期管理、升级路径
prerequisites: []
tags: [通信协议, stdio, JSON-RPC]
---

# CAIAO stdio 通信协议

## 协议概述

CAIAO Server 与 Hub 之间通过标准输入输出（stdin/stdout）进行通信，使用 JSON 行协议（每行一个完整的 JSON 消息）。

## 两种实现

### MCP SDK 版本（拆除模拟器）

使用 Python `mcp` 包的 `stdio_client()` 和 `StdioServerParameters`：

```
Hub (CAIAOClientHub)
  │
  ├─ StdioServerParameters(command, args, cwd)
  ├─ stdio_client(server_params) → (read, write)
  ├─ ClientSession(read, write)
  └─ session.initialize() → session.list_tools() → session.call_tool()
```

MCP SDK 自动处理 JSON-RPC 序列化、超时、重连等。开发者不需要关心底层协议细节。

### 轻量版本（钢框架设计）

自定义 `SubprocessManager` + `run_stdio_loop()`：

**请求格式**（Hub → Server）：
```json
{"method": "list_tools", "params": {}, "id": 1}
{"method": "call_tool", "params": {"tool_name": "xxx", "input": {...}}, "id": 2}
{"method": "get_metadata", "params": {}, "id": 3}
```

**响应格式**（Server → Hub）：
```json
{"id": 1, "result": [{"name": "tool_a", ...}]}
{"id": 2, "result": {"status": "success", "data": {...}}}
{"id": 3, "result": {"name": "MyServer", "version": "1.0.0", ...}}
```

**错误响应**：
```json
{"id": 1, "error": "Unknown method: bad_method"}
```

## 支持的方法

| method | params | 返回 | 说明 |
|--------|--------|------|------|
| `list_tools` | `{}` | 工具列表 | 声明 Server 能力 |
| `call_tool` | `{"tool_name": "...", "input": {...}}` | 工具执行结果 | 执行指定工具 |
| `get_metadata` | `{}` | Server 元数据 | 返回版本、分类、依赖等 |

## 子进程生命周期管理

### 启动
- lazy=True：首次 `call_tool` 时 spawn
- lazy=False：Hub 启动时立即 spawn
- 启动后立即发送 `list_tools` 请求，获取工具列表并注册

### 通信
- stdin：Hub → Server，每行一个 JSON 请求
- stdout：Server → Hub，每行一个 JSON 响应
- stderr：日志输出（不参与协议通信）
- Python 子进程需要 `-u` 参数（禁用 stdout 缓冲）

### 终止
1. SIGTERM 信号
2. 等待 5 秒
3. 仍存活则 SIGKILL
4. 超时 3 秒后强制结束

### 崩溃恢复
- Hub 检测到子进程意外退出（stdout 关闭或 returncode 非零）
- 如果配置了 `restart_on_crash: true`，自动重启（最多 `max_restarts` 次）
- 崩溃期间工具返回错误，不阻塞调用方

## 协议升级路径

轻量版本的手写 JSON-RPC 循环（`run_stdio_loop()`，约 128 行）可替换为 MCP SDK 的 `stdio_server()`（约 10 行）：

手写循环 → MCP SDK transport → 零业务逻辑改动

因为 `list_tools()` 输出格式与 MCP `tools/list` 兼容，`call_tool()` 语义与 MCP `tools/call` 一致。
