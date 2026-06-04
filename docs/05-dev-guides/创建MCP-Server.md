---
level: ★★
audience: developer
abstract: 创建 MCP SDK Server——目录结构、实现契约、编写清单、注册
abstract_en: Creating an MCP SDK Server - directory structure, implementation contract, writing the manifest, registration
prerequisites: []
tags: [MCP-SDK, 开发, 教程]
---

# 创建 CAIAO Server（MCP SDK 版本）

> 适用于使用 `caiao` 框架包（MCP SDK 路径）的项目。

## 前置条件

- Python 3.11+
- `mcp>=1.0.0` 已安装
- 项目已安装 `caiao` 包（`pip install "git+https://github.com/LaobaiAi/CAIAO.git#subdirectory=caiao"`）

## 步骤一：创建 Server 目录和文件

推荐使用 CLI 一键生成：

```bash
caiao new server my-solver
```

自动生成：
```
servers/
└── my_solver/
    ├── server.py       # Server 骨架
    └── caiao.yaml      # 清单文件
```

也可以手动从 `caiao/templates/server/` 复制模板。

## 步骤二：实现 Server（server.py）

核心骨架遵循 CAIAO 契约。关键点：

- `list_tools()` 返回 `types.Tool` 列表，每个工具含 name、description、inputSchema
- `call_tool()` 返回 `list[TextContent]`，内容为 JSON 字符串
- 始终用 try/except 包裹，返回 `{"error": str(e)}`，绝不崩溃
- 工具名使用 snake_case
- inputSchema 是 JSON Schema，LLM 用其生成正确的参数

## 步骤三：编写 caiao.yaml 清单

CLI 已生成骨架，只需修改 description、tools、capabilities 等字段。详见「04-caiao-yaml-system/清单规范.md」。

## 步骤四：注册

两种方式：

### 方式 A：通过 caiao.yaml 自动发现（推荐）

只需确保 `caiao.yaml` 内容正确。Hub 初始化时 `discover_server_configs()` 自动扫描 `servers/` 目录并注册。

### 方式 B：手动配置（Legacy 项目兼容）

在调用 `discover_server_configs()` 时通过 `legacy_configs` 参数传入额外的配置列表。适用于已有项目渐进迁移。

## 步骤五：验证

```bash
caiao validate           # 校验清单
caiao list               # 查看是否出现在 Server 列表中
```

Server 工具会自动出现在 Hub 的 `list_tools()` 返回中。如果设为 `lazy: true`，工具会出现在列表中但实际进程在首次调用时才启动。

## 契约要点

1. 始终返回 `[TextContent(type="text", text=json.dumps(...))]`——绝不返回原始字符串
2. 所有内容序列化为 JSON——Hub 从 JSON 字符串中提取 result
3. 捕获所有异常并返回 `{"error": str(e)}`——绝不让子进程崩溃
4. 非惰性 Server 必须快速启动——模块级别不做重量级导入
5. 惰性 Server 必须优雅降级——如果依赖缺失，返回 `{"error": "unavailable"}`

## 常见陷阱

| 陷阱 | 症状 | 对策 |
|------|------|------|
| 子进程启动超时 | 工具始终不可用 | 检查 import 是否在模块级别耗时，改用惰性导入 |
| JSON 序列化失败 | 调用返回错误 | NumPy 数组用 `.tolist()` 转换 |
| 工具名冲突 | 路由到错误的 Server | 确保工具名全局唯一 |
| stdin/stdout 缓冲 | 通信超时 | Python 启动参数加 `-u`（无缓冲） |
