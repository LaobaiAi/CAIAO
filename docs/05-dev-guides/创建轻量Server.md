---
level: ★★
audience: developer
abstract: 四步创建轻量 CAIAO Server——继承 CAIAOServer、@tool 装饰器、选择模式、注册 Hub
prerequisites: []
tags: [轻量实现, 开发, 教程]
---

# 创建 CAIAO Server（轻量版本）

> 适用于不使用 MCP SDK 的 CAIAO 项目。仅需两个文件：Server 基类和 Hub 调度中心。

## 前置条件

- Python 3.10+
- 项目中有 `server.py`（CAIAOServer 基类 + @tool 装饰器）
- 项目中有 `hub.py`（Hub 调度中心）

## 步骤一：创建 Server 文件

在 `servers/` 下新建 `.py` 文件：

```
servers/
└── my_server.py
```

## 步骤二：实现 Server 类

核心骨架：
- 继承 `CAIAOServer`
- 覆盖类级元信息（server_name、server_version、server_category、server_type）
- 用 `@tool` 装饰器注册工具
- 工具方法接收 `input_data: dict`，返回 `dict`
- `__main__` 块提供独立启动能力（CLI 模式 + stdio 循环）

## 步骤三：选择运行模式

### 编排型 Server
```
server_type = "orchestration"
_caiao_subprocess = False  # Hub 自动发现
```
适用于：Pipeline、CLI 编排器、参数校验器、报告生成器

### 计算型 Server
```
server_type = "computational"
_caiao_subprocess = True   # Hub 跳过，需手动注册子进程
```
适用于：FEA 求解器、大计算量算法引擎

## 步骤四：注册到 Hub

### 方式 A：自动发现（in_process）

文件放在 `servers/` 目录，Hub 初始化时自动扫描并注册。条件：
1. 文件名不以 `_` 开头
2. 类继承 `CAIAOServer`
3. `_caiao_subprocess = False`

### 方式 B：手动注册（需要 hub 引用）

```
hub = Hub()
my_server = MyServer(hub=hub)
hub.register(my_server)
```

### 方式 C：注册为子进程

```
hub.register_subprocess({
    "name": "my_computation",
    "command": sys.executable,
    "args": ["-u", "-m", "servers.my_server"],
    "cwd": project_root,
    "lazy": True,
    "tools": ["run_analysis"],
})
```

## @tool 装饰器规范

三个参数：
- `name`：snake_case，唯一
- `description`：写清功能、输入含义、输出含义、适用场景、调用时机
- `input_schema`：JSON Schema，每个 property 必须有 description

## 返回值规范

- 必须返回纯 dict，所有值可 JSON 序列化
- 成功：包含业务数据字段
- 失败：`{"error": "描述信息"}`
- 不以异常形式传播错误

## 检查清单

### 代码层面
- 单一 `.py` 文件，放在 `servers/` 目录
- 继承 `CAIAOServer`，覆盖类级元信息
- 使用 `@tool` 装饰注册所有公开工具
- 每个工具的 name 唯一、description 完整、inputSchema 所有 property 有 description
- 返回值为纯 dict
- `__main__` 块支持独立启动
- 不 import 任何其他 Server
- 最低外部依赖
- 计算型 Server 设置 `_caiao_subprocess = True`

### 功能层面
- 可从 CLI 独立启动测试
- `list_tools()` 返回正确格式
- `call_tool()` 异常时返回错误字典
- 边界情况处理（空输入、极值、非法参数）

### 集成层面
- Hub 自动发现能正确注册（in_process 模式）
- 通过 `Hub.call_tool()` 调用成功
- Pipeline 中包含端到端测试验证
