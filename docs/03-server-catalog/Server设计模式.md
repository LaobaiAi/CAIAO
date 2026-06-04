---
level: ★★★
audience: architect
abstract: 七种 CAIAO Server 设计模式——合并、编排管线、基础设施+功能、LLM 三层架构、双模 Hub、原子模板、管线铁律
abstract_en: Seven CAIAO Server design patterns - merge, orchestration pipeline, infrastructure+function, three-layer LLM, dual-mode Hub, atomic template, pipeline invariants
prerequisites: [Server种类说明.md]
tags: [设计模式, 架构, 合并]
---

# CAIAO Server 设计模式

## 模式一：合并（Merge）

最强大的 CAIAO 模式。当同一 Server 序列反复出现在工作流中时，将它们合并为一个新 Server。

### 何时合并
同一序列的 Server 调用在工作流中反复出现。典型示例是一个反复出现的多步工作流：

合并前：3 次子进程 hop → 合并后：1 次子进程 hop

### 合并规则
1. **导入逻辑，不依赖源 Server 进程**。合并 Server 从已有 Server 模块导入函数/类。
2. **不修改源 Server**。原子 Server 保持独立不变。
3. **返回统一结果**。合并 Server 的工具在一次响应中返回前端所需全部内容。
4. **保留旧 Server**。原子 Server 仍可供需要单独使用的用户。

### 已完成的合并

| 合并 | 涉及 Server | 状态 |
|------|-----------|------|
| Pipeline A | 生成 Server + 分析 Server + 选关键 Server | ✅ Done |
| Pipeline B | 3D 生成 → 转换 → 3D 分析 → 选关键 | ✅ Done |
| Verify Suite | 多个求解器 → 共识验证 | 📋 Planned |
| 操作循环 | 应用操作 + 分析 + 选关键 | 📋 Planned |

---

## 模式二：Composite 管线

声明式配置，无需写代码即可串联多个 Server。

### 优势
- 零代码——纯 YAML 配置
- 自动上下文传递
- 错误时自动停止
- Hub 自动注册

### 限制
- 只能编排已存在的工具
- 不能包含条件逻辑或循环
- 步骤间数据传递仅限于声明式 `input_map`

### 适用场景
简单的线性工作流，如「数据建模 → 计算分析 → 结果呈现」。

---

## 模式三：Infrastructure + 功能 Server

将共享运行时环境建模为显式 Server。

### 模式结构
```
基础设施 Server（eager, 只读工具）
  ├─ resolve_* → 发现二进制/路径
  ├─ validate_* → 健康检查
  └─ provide_* → 返回配置

功能 Server（lazy, 声明 depends_on）
  ├─ 接收注入的环境变量
  └─ 执行实际计算/建模/渲染
```

### 优势
- 消除硬编码路径
- 统一错误报告（基础设施层一次报告，而非每个功能 Server 各自报错）
- 依赖关系可视化
- 环境变更只需改一处

---

## 模式四：LLM 三层架构

将 LLM 集成拆分为三层：

```
编排层（合并 Server）→ 纯编排，ReAct 循环，通过 Hub 调度
计算层（原子 Server）→ 纯计算，JSON 解析/校验/填充默认值
通信层（原子 Server）→ 唯一网络层，chat_completion() / stream_chat()
```

### 设计理由
- 通信层是唯一需要 API Key 和网络访问的组件
- 计算层和编排层可独立测试，不依赖网络
- 更换 LLM 提供商只需换通信层
- 每层可独立版本管理和部署

---

## 模式五：Hub 感知 vs 无 Hub

| | Hub 感知 Server | 无 Hub Server |
|---|---|---|
| 构造 | `__init__(self, hub=None)` | `__init__(self)` |
| 调用其他工具 | `self._hub.call_tool(name, input)` | 不调用其他工具 |
| 注册方式 | 手动 `hub.register(instance)` | 自动发现 |
| 示例 | 编排器 Server、CLI 编排器 | 生成器 Server、求解器 Server |

Hub 感知 Server 在工具内部需要通过 Hub 调用其他工具时使用。构造时注入 Hub 引用，通过 `hub.register()` 手动注册（而非自动发现）。

---

## 模式六：原子 Server 模板（两种实现）

### MCP SDK 版本

```
from mcp.server import Server
from mcp.types import Tool, TextContent

server = Server("my-server")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [Tool(name="my_tool", description="...", inputSchema={...})]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    return [TextContent(type="text", text=json.dumps({"result": "ok"}))]
```

### 轻量版本

```
from servers.base import CAIAOServer, tool

class MyServer(CAIAOServer):
    server_name = "my-server"
    server_type = "orchestration"

    @tool(name="my_tool", description="...", input_schema={...})
    def my_tool(self, input_data: dict) -> dict:
        return {"result": "ok"}
```

---

## 模式七：Pipeline Server 铁律

适用于合并 Server 中的管线编排方法：

1. 不含任何领域计算逻辑
2. 只做数据传递和顺序编排
3. 下游输入 = 上游输出 + 原始参数（必要时 merge）
4. 每步检查错误——任一步失败立即终止并报告
5. 保存中间结果（JSON 文件），便于调试和断点续跑
