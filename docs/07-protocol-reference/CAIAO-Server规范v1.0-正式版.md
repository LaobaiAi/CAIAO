---
level: ★★★
audience: architect
abstract: CAIAO Server 规范 v1.0 正式版——三接口契约、目录结构、版本管理、依赖声明、测试要求、MCP 兼容性映射
abstract_en: CAIAO Server specification v1.0 - three-interface contract, directory structure, version management, dependency declaration, testing requirements, MCP compatibility mapping
prerequisites: [核心设计原则.md]
tags: [规范, 协议, 接口, v1.0]
---

# CAIAO Server 规范 v1.0（正式版）

> 本文档是 CAIAO Server 生态的正式规范。所有接入 CAIAO 生态的 Server 必须符合本规范。
> 源文件：`steel-frame-design/specs/CAIAO_SERVER_V1.md`

---

## 1. CAIAO Server 契约

每个 CAIAO Server 必须实现三个核心接口。

### 1.1 list_tools() → list[dict]

返回该 Server 提供的所有工具描述。每个工具描述必须包含：

| 字段 | 类型 | 必须 | 说明 |
|------|------|------|------|
| name | string | ✅ | 工具唯一标识，蛇形命名 (snake_case) |
| description | string | ✅ | 工具功能描述，AI Agent 据此判断何时调用 |
| inputSchema | object | ✅ | JSON Schema 格式的输入参数定义 |

### 1.2 call_tool(tool_name, input_data) → dict

执行指定工具，返回结果字典。

- 调用不存在的工具：返回 `{"error": "Tool 'xxx' not found"}`
- 执行异常：返回 `{"error": "Tool 'xxx' execution failed: ..."}`
- 正常执行：返回业务结果 dict，不应包含 error 键

### 1.3 get_metadata() → dict

返回 Server 元数据，包含 name、version、category、description、tools、dependencies、compatibility 字段。compatibility 必须声明 caiao_spec（规范版本）和 mcp（是否支持 MCP 协议）。

### 1.4 run_stdio_loop()（可选）

启动 stdio JSON 循环，用于子进程模式和将来 MCP 集成。

---

## 2. 目录结构约定

```
my-project/
├── servers/
│   ├── server.py                    # CAIAOServer 基类 + @tool 装饰器
│   ├── my_domain_server.py        # 原子 Server（一个 .py 文件一个 Server）
│   └── ...
├── hub.py                   # 轻量调度中心（自动发现 Server）
├── schemas/                       # JSON Schema 定义
├── tests/                         # 测试文件
└── docs/                          # 文档
```

### 命名规则

| 对象 | 规范 | 示例 |
|------|------|------|
| Server 文件 | `{domain}_{function}.py` | `steel_frame_generator.py` |
| 工具名称 | `{verb}_{noun}` | `generate_frame`, `check_code` |
| Server 类名 | PascalCase | `SteelFrameGenerator` |
| 合并 Server | 名以 pipeline、orchestrator 结尾 | `SteelFramePipeline` |

---

## 3. 原子 Server 设计原则

### 3.1 单一职责
一个 Server 只承担一项域能力。

### 3.2 零间接依赖
Server 间绝不直接 import。所有跨 Server 通信通过 Hub 传递 JSON。

### 3.3 无状态
`call_tool()` 每次调用独立，不依赖实例状态。

### 3.4 纯计算
Server 不包含 GUI、网络、数据库逻辑。文件 I/O 仅限于通过参数指定的路径。

---

## 4. 合并 Server 模式

合并 Server (Pipeline / Orchestrator) 的本质是编排：

- 不包含领域计算逻辑
- 通过 Hub 顺序/条件调用原子 Server
- 数据传递：上游输出 → 下游输入
- 错误处理：任一步骤失败，立即返回明确错误信息

---

## 5. 版本管理

| 规则 | 说明 |
|------|------|
| 版本格式 | MAJOR.MINOR.PATCH（SemVer） |
| MAJOR | 不兼容的 API 修改（工具删减、输入 Schema 变更） |
| MINOR | 新增工具、向后兼容的功能增加 |
| PATCH | Bug 修复、性能优化 |

版本号在 `server_version` 类属性中声明。

---

## 6. 依赖声明格式

```python
class MyServer(CAIAOServer):
    server_dependencies = ["numpy>=1.24", "pyyaml>=6.0"]
```

- 只声明 Server 自身的直接依赖
- 使用 pip 兼容的包名和版本约束
- 不声明 Python 标准库

---

## 7. 测试要求

每个 CAIAO Server 应包含：

| 测试类型 | 最小要求 |
|----------|----------|
| list_tools() | 验证返回列表非空、每个工具含 name/description/inputSchema |
| get_metadata() | 验证返回完整元数据 |
| call_tool() 正常输入 | 至少一个正向测试用例 |
| call_tool() 异常输入 | 验证错误返回含 error 键 |
| Hub 集成测试 | 验证 find_tool() 和 call_tool() 路由正常 |
| 端到端测试 | Pipeline 全流程跑通 |

---

## 8. 与 MCP 的兼容性

CAIAO Server 已预对齐 MCP 协议：

| CAIAO 接口 | MCP 对应 |
|------------|----------|
| list_tools() | tools/list |
| call_tool(name, input) | tools/call |
| get_metadata() | 扩展元数据（MCP 1.0 未标准化） |
| run_stdio_loop() | MCP stdio transport |

迁移到 MCP 只需将 run_stdio_loop() 中的手写 JSON 循环替换为 MCP SDK 的 transport——业务代码零改动。

---

## 9. 生态贡献 Checklist

### 代码
- 继承 CAIAOServer，使用 @tool 注册
- 单一 .py 文件，无跨 Server import
- 类属性声明：server_name, server_version, server_category, server_dependencies
- get_metadata() 返回完整信息
- __main__ 块支持 run_cli()

### 输入输出
- @tool 的 input_schema 每个字段有 description
- 返回纯 dict，可 JSON 序列化
- 错误时返回 {"error": "..."}

### 文档
- 模块 docstring 说明蒸馏来源、功能、依赖
- 工具 description 写清功能和适用条件

### 测试
- 至少一个正向测试用例
- 边界/异常输入测试
- Hub 集成测试通过
