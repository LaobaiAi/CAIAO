---
level: ★★
audience: developer
abstract: CAIAO Server 三层测试金字塔、两种实现测试方法、四种常见调试场景、Bug 模式速查
prerequisites: []
tags: [测试, 调试, 质量]
---

# CAIAO Server 测试与调试指南

> 如何高效地测试和调试两种实现中的 CAIAO Server。
> 基于 32+ 个单元测试和 8 个已修复 Bug 的实际经验。

---

## 一、测试策略

### 三层测试金字塔

```
         ┌──────────┐
         │ E2E 测试  │  ← 完整管线端到端验证（少但关键）
         ├──────────┤
         │ 集成测试  │  ← Server 间数据流验证
         ├──────────┤
         │ 单元测试  │  ← 每个工具的独立输入输出验证（多）
         └──────────┘
```

### 单元测试（每台 Server 必备）

测试内容：
1. `list_tools()` 返回格式正确
2. 每个工具的合法输入 → 预期输出
3. 每个工具的边界输入（空值、极值）→ 不崩溃
4. 每个工具的错误输入 → 返回 `{"error": "..."}` 格式
5. Schema 一致性（caiao.yaml 声明的工具 vs list_tools 返回的工具）

### 集成测试（管线 Server 必备）

测试内容：
1. Server A 的输出 → Server B 的输入（数据格式兼容）
2. Pipeline 端到端：输入原始参数 → 获得最终结果
3. Pipeline 中间步骤失败 → 整体返回失败

### E2E 测试（每次大变更后运行）

测试内容：
1. 完整用户流程：自然语言 → LLM Agent → 工具调用 → 前端渲染
2. CLI 一键命令：`python cli/main.py run --quick`
3. Web API：curl 每个端点

---

## 二、轻量实现的测试方法

### 直接调用测试

轻量实现的最大优势——可以直接 import 并测试：

1. 导入 Server 类
2. 实例化
3. 调用 `call_tool(tool_name, input_data)`
4. 断言返回 dict 中的字段

### CLI 调试

每个轻量 Server 自带 CLI 入口：
- 无参数 → 列出所有工具
- `tool_name '{"key":"val"}'` → 调用工具并打印 JSON 结果

这是最快的调试方式——不需要启动 Gateway。

### 子进程模式测试

启动子进程，通过 stdin 发送 JSON 请求：
- 启动 `python -u servers/my_server.py`
- 通过管道发送 `{"method": "list_tools", "params": {}, "id": 1}`
- 验证响应格式

---

## 三、MCP SDK 实现的测试方法

### 直接测试业务逻辑

将业务逻辑提取为独立函数（在 Server 的 call_tool 之前），直接测试这些函数。不要通过 MCP 协议层测试。

### Gateway 集成测试

1. 启动 Gateway
2. 调用 `GET /tools` 验证所有工具已注册
3. 通过 WebSocket 发送工具调用请求
4. 验证响应格式

### 子进程启动验证

检查子进程是否正确启动：
- 查看 Gateway 日志中的 "CAIAO server 'X' ready with N tools"
- 调用 GET /servers 端点查看状态

---

## 四、常见调试场景

### 场景 1：工具调用返回空结果

**排查步骤**：
1. 检查 Gateway 日志中是否有 "Tool call 'X' failed"
2. 检查子进程是否存活（`GET /servers` → state 字段）
3. 检查输入参数格式是否符合 JSON Schema
4. 用 CLI 模式直接调用工具排查

### 场景 2：子进程静默崩溃

**症状**：工具突然不可用，Gateway 日志无错误

**排查**：
1. 检查子进程 stderr 输出（重定向到日志文件）
2. 在 Server 代码中添加打印到 stderr 的调试信息
3. 检查内存是否耗尽（重量级求解器常见）

### 场景 3：asyncio 相关错误

**症状**：`Task was destroyed but it is pending!` 或超时

**常见原因**：
- 忘记 await 异步函数
- 事件循环嵌套
- 子进程 stdout/stderr 缓冲区满导致死锁

**修复**：
- 确保所有 MCP 工具函数的调用路径都正确 await
- 子进程 stderr 定期读取（不要等进程结束）
- 添加超时机制

### 场景 4：JSON 序列化失败

**症状**：`TypeError: Object of type X is not JSON serializable`

**常见原因**：
- NumPy 数组未转 list
- MCP TextContent 对象未被提取
- 自定义类实例

**修复**：
- NumPy 数组：`.tolist()`
- TextContent：`.text` 属性
- 自定义类：添加 `to_dict()` 方法

---

## 五、Bug 模式速查表

> 以下 Bug 模式来自参考实现的真实调试经验。具体的症状描述和原因分析是通用的模式，但"参考 Bug"编号来自特定项目——理解模式本身即可。

| 症状 | 可能原因 | 参考 Bug |
|------|---------|---------|
| 分析返回空结果 | 前端未传递必要的结构参数 | F1 |
| 子进程无法启动 | 虚拟环境路径不存在 | 模式 8 |
| 多求解器结果不一致 | 输出字段名约定不同 | F4 |
| 对话切换后状态丢失 | 恢复函数未解析所有步骤 | F6 |
| WebSocket 断开无响应 | 前端未实现重连 | 未解决 #1 |
| 视频渲染黑屏 | 通信协议与运行时状态竞态 | 未解决 #2 |
| 大场景动画卡顿 | UI 状态每帧全量更新 | 未解决 #4 |

---

## 六、调试工具清单

| 工具 | 用途 |
|------|------|
| `GET /tools` | 验证所有工具已注册 |
| `GET /servers` | 查看 Server 状态和指标 |
| `python server.py` | 轻量 Server 的 CLI 调试 |
| Gateway 日志 | 子进程启动/工具调用/错误追踪 |
| `subprocess.stderr` 重定向 | 子进程内部错误日志 |
| `jsonschema.validate()` | 开发阶段验证输出格式 |
