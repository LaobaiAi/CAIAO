---
level: ★★
audience: developer
abstract: CAIAO 框架的完整退场指南——如何在不破坏已有 Server 的前提下干净移除 CAIAO
abstract_en: Complete exit guide for CAIAO - how to cleanly remove the framework without affecting existing Servers
prerequisites: []
tags: [退场, 卸载, 迁移, 解耦]
---

# CAIAO 退场机制

> CAIAO 设计为可移除的。你的 Server 是标准 MCP Server，不依赖 CAIAO 框架。
> 框架是便利层，不是硬依赖。

---

## 设计保证

退场之所以可行，是因为三条设计约束：

1. **Server 不从 CAIAO 导入**：每个 Server 直接导入 `mcp.server`（MCP SDK 路径）或继承 `CAIAOServer`（轻量路径）。框架代码只在 Hub/编排层使用。
2. **每个 Server 可独立运行**：任何一个 Server 都可以作为独立的 stdio 进程启动，不需要 Hub。
3. **业务逻辑和框架分离**：`@tool` 装饰的方法中的业务逻辑与 CAIAO 无关，可以迁移到任何其他工具框架。

---

## MCP SDK 路径退场步骤

### 当前状态
```
Application → Hub.call_tool() → MCP Session → Server subprocess
```

### 退场后状态
```
Application → MCP Session → Server subprocess
```

### 操作步骤

**1. 移除框架包**
```bash
pip uninstall caiao
```

**2. 替换 Hub 调用为直接 MCP Session**

退场前：
```python
from caiao import CAIAOClientHub
hub = CAIAOClientHub(configs)
result = await hub.call_tool("my_tool", {"param": "value"})
```

退场后：
```python
from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession

params = StdioServerParameters(
    command="python", args=["server.py"], cwd="servers/my_server"
)
async with stdio_client(params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        result = await session.call_tool("my_tool", {"param": "value"})
```

**3. 处理多 Server 场景**

如果原先依赖 Hub 的多 Server 管理（启动、路由、健康检查），需要自行实现简单的注册表：
```python
# 简单的工具路由（替代 Hub 的 tool_registry）
TOOL_SERVERS = {
    "my_tool": ("servers/my_server", ["server.py"]),
    "other_tool": ("servers/other_server", ["server.py"]),
}

async def call_tool(name, args):
    server_dir, cmd = TOOL_SERVERS[name]
    params = StdioServerParameters(command="python", args=cmd, cwd=server_dir)
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            return await session.call_tool(name, args)
```

**4. 删除项目中的 CAIAO 文件**
- 删除 `caiao/` 目录（如有本地副本）
- 删除 `caiao.yaml` 项目配置（可选保留——是标准 YAML，无代码依赖）
- 从 `requirements.txt` 删除 `caiao` 条目

---

## 轻量路径退场步骤

轻量路径的退场更简单——框架文件就在项目里。

### 操作步骤

**1. 删除框架文件**（无论放在项目根目录还是 `caiao/` 子目录）：
```bash
rm server.py hub.py subprocess.py
# 或如果放在子目录
rm -r caiao/
```

**2. 将 @tool 方法改为直接调用**

退场前：
```python
hub = Hub()
hub.register(MyCalculator())
result = hub.call_tool("add", {"a": 3, "b": 4})
```

退场后：
```python
calc = MyCalculator()
result = calc.call_tool("add", {"a": 3, "b": 4})
```

`CAIAOServer` 的 `call_tool` 方法在退场后仍然可用——它只是一个普通的 Python 方法调用。如果你保留了 `server.py` 文件，什么都不用改，直接调用即可。

**3. （可选）移除 CAIAOServer 继承**

如果希望完全去除 CAIAO 痕迹，将 `@tool` 方法改为普通方法：
```python
# 退场前
class MyCalculator(CAIAOServer):
    @tool
    def add(self, args):
        return {"result": args["a"] + args["b"]}

# 退场后
class MyCalculator:
    def add(self, a, b):
        return a + b
```

工作量取决于 Server 数量。可以渐进式进行。

---

## 退场检查清单

- [ ] 确认所有 Server 的 `server.py` 不从 `caiao` 导入（只从 `mcp.server` 或 `caiao_lightweight.server` 导入）
- [ ] 在退场前运行一次完整测试，建立基线
- [ ] 移除 CAIAO 依赖后运行同样的测试，确认结果一致
- [ ] 更新项目文档，移除对 CAIAO Hub 的引用
- [ ] 如使用 CI/CD，更新构建脚本去掉 CAIAO 安装步骤

---

## 退场影响评估

| 能力 | 使用 Hub 时 | 退场后 | 影响 |
|------|----------|--------|:---:|
| 单工具调用 | `hub.call_tool()` | 直接 MCP Session 调用 | 多写 5 行 |
| 多 Server 管理 | Hub 自动管理 | 自行维护 Server 注册表 | 需自行实现 |
| 惰性启动 | Hub 按需启动 | 需要时手动启动 | 简单但繁琐 |
| 语义路由 | Hub 模糊匹配 | 不支持 | 低 |
| 并行调用 | `call_tools_parallel` | `asyncio.gather` | 无变化 |
| 健康监控 | `get_all_health()` | 不支持 | 低 |
| Server 本身 | 不变 | 不变 | 无 |

结论：核心功能（单工具调用）多写几行代码即可。管理便利性功能（多 Server 生命周期、健康监控）需要自行实现或使用其他工具替代。

---

## 常见问题

**Q：退场后 Server 还能用吗？**
A：能。每个 Server 是独立的 MCP Server，不依赖 CAIAO 运行时。

**Q：caiao.yaml 文件怎么办？**
A：保留或删除都可以。它是标准 YAML，不含可执行代码。如果以后想重新启用 CAIAO，保留清单文件可以快速恢复。

**Q：轻量路径退场后 @tool 装饰器还能用吗？**
A：`@tool` 只是打了一个标记 `_is_caiao_tool = True`。即使删除 CAIAOServer 基类，被装饰的方法本身不受影响。

**Q：如果只是想换一个编排框架，有什么选择？**
A：任何支持 MCP 协议的客户端都可以直接连接你的 Server。CAIAO 的 Server 就是标准 MCP Server，不和 CAIAO Hub 绑定。
