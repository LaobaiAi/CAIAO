---
level: ★★★
audience: architect
abstract: 常驻服务（Daemon）通用架构模式——适用场景、角色定义、参数扩展三机制、进程模型、容错设计
prerequisites: [核心设计原则.md]
tags: [Daemon, 架构模式, 常驻服务]
---

# 常驻服务（Daemon）架构模式

> 当外部重型工具（如 Blender、Abaqus、MATLAB、ANSYS）需要被多次调用且冷启动开销大时，将其从"一次性工具"升级为"常驻服务"是一种通用模式。
> Blender 的具体实施案例见附录：`appendix/Blender-Daemon-实施案例.md`。

---

## 一、模式适用场景

以下条件全部满足时，考虑使用 Daemon 模式：

1. 外部工具有显著的冷启动开销（数秒到数十秒）
2. 同一工具被多个 Server 重复调用
3. 调用是顺序的（工具的 API 非线程安全）
4. 工具可以保持长连接（不会自动超时断开）

---

## 二、模式定义

### 架构角色

```
environment_server（infrastructure, eager）
  → 发现工具路径、验证环境、提供配置
        │
daemon_server（infrastructure, eager）
  → 启动并维持外部工具进程，暴露细粒度指令
        │
        ├── functional_server_a → daemon.指令()
        ├── functional_server_b → daemon.指令()
        └── functional_server_c → daemon.指令()
```

### 角色说明

| Server | 类型 | 职责 |
|--------|------|------|
| environment_server | infrastructure, eager | 发现外部工具路径、校验版本和许可证、注入环境变量 |
| daemon_server | infrastructure, eager | 启动并维持外部工具常驻进程、暴露原生指令、管理进程生命周期 |
| functional_servers | atomic | 不直接启动外部工具，通过 daemon 发指令完成业务逻辑 |

### Daemon 的关键约束

- 外部工具的 API 若非线程安全 → 所有指令串行执行，单队列
- 一台机器只一个外部工具进程
- 功能 Server 不含任何工具启动逻辑——只做校验和转发

### Daemon 暴露的工具应是原生粒度

不暴露粗粒度业务工具（如"构建整个模型"），而是暴露外部工具的原子操作（如"创建构件""设置属性""插入关键帧"）。业务编排由功能 Server 负责。

---

## 三、参数扩展三机制

当结构形式增多、参数种类膨胀时，用以下三机制管理复杂度。

### 机制 1：命名空间隔离

扩展字段挂各自前缀，避免跨类型污染。每种结构/领域只在自己的命名空间下定义扩展字段。

### 机制 2：Schema 注册表

扩展字段需在注册表中声明（名称、类型、默认值、描述）。未声明的扩展字段 → 警告并跳过。

### 机制 3：三级分层

| 层 | 定义 | 处理方式 |
|----|------|---------|
| **基础层** | 所有结构/场景共有 | 必须提供，Schema 强制校验 |
| **扩展层** | 某类结构/场景特有 | 需在注册表声明，可选 |
| **透传层** | 上游不识别但下游可能需要 | 标记 transient，不校验 |

---

## 四、进程模型（通用决策框架）

当决定各 Server 的运行位置（子进程 vs 主进程 local handler）时：

| Server 类型 | 推荐运行位置 | 理由 |
|------------|-------------|------|
| environment_server | 子进程 | 环境发现，轻量，可独立重启 |
| daemon_server | 子进程 | 管理外部 OS 进程生命周期，崩溃影响可控 |
| 编排型功能 Server | 考虑主进程 local handler | 纯编排（读参数 + 调 daemon），无计算，放主进程零开销 |
| 计算型功能 Server | 子进程 | 重量级操作需要进程隔离 |

---

## 五、容错设计

1. **外部进程崩溃**：daemon 检测子进程退出 → 自动重启 → 恢复状态 → 继续服务
2. **指令队列溢出**：设置最大队列深度，超出时返回错误而非无限排队
3. **健康检查**：daemon 定期 ping 外部工具（执行空操作验证可用性）
4. **优雅关闭**：收到终止信号 → 保存状态 → 关闭外部工具 → 退出

---

## 六、附录

- Blender Daemon 完整实施案例（含 7 步计划、具体性能数据、Blender API 细节）：`appendix/Blender-Daemon-实施案例.md`
