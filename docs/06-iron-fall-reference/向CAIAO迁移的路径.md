---
level: ★★
audience: developer
abstract: 项目向 CAIAO 迁移的通用方法论——求解器盘点、分类优先级、通信协议迁移、数据模型迁移
abstract_en: General migration methodology - solver inventory, prioritization, protocol migration, data model migration
prerequisites: [项目概述.md]
tags: [迁移, 方法论, 协议]
---

# 项目向 CAIAO 迁移的方法论

> 基于 Iron-Fall 向 CAIAO 迁移的实践经验，提炼为通用迁移方法论。
> 具体的求解器到 Server 映射表见附录：`appendix/Iron-Fall-迁移映射表.md`。

---

## 一、迁移核心步骤

### 1. 求解器盘点

列出源项目中所有独立计算模块。判断标准：
- 有明确的输入和输出
- 可以独立运行（不依赖其他模块的内存状态）
- 有独立的算法逻辑

每个符合条件的模块 = 一个候选 CAIAO Server。

### 2. 分类与优先级

对每个候选 Server 分类：
- **可直接迁移**：逻辑独立、接口清晰、无框架依赖 → 优先迁移
- **需重构后迁移**：逻辑独立但耦合了框架代码（HTTP、ORM、Agent wrapper）→ 剥离后迁移
- **需重新设计**：逻辑与其他模块深度耦合 → 重新设计边界后迁移
- **可被替代**：功能已被其他 Server 或前端覆盖 → 不迁移

### 3. 确定 Server 属性

| 属性 | 判断依据 |
|------|---------|
| 种类（atomic / composite / infrastructure） | 是否编排其他 Server |
| 启动模式（lazy / eager） | 是否轻量、是否高频使用 |
| 运行模式（子进程 / 主进程 local handler） | 是否重量级、崩溃影响范围 |

### 4. 通信协议迁移

| 迁移前 | 迁移后 |
|:---|:---|
| REST 端点（多且分散） | 仅 WebSocket + 少量 REST |
| 自定义消息类型 | MCP JSON-RPC |
| 原始 dict over WebSocket | TextContent JSON over stdio |

### 5. 数据模型迁移

源系统的数据模型通常有两种处理方式：
- **集中式 Pydantic 模型** → 拆分到各 Server 内部的 JSON Schema
- **全局共享类型** → 各 Server 定义自己的输入输出，通过标准化字段名保持兼容

---

## 二、迁移经验总结

1. **一求解器一 Server**：源系统的每个独立计算模块对应一个新 CAIAO Server
2. **保留纯计算逻辑**：去除框架 wrapper、HTTP 依赖、ORM 集成
3. **添加 JSON Schema**：为输入输出定义完整的 JSON Schema（源系统若有类型定义，是很好的起点）
4. **惰性启动**：重量级求解器设为 lazy，按需启动
5. **双轨保留**：迁移后的 Server 与原求解器可短期并存，做 A/B 比较验证
6. **测试先行**：源系统的测试用例可作为 Server 测试的参考输入/输出

---

## 三、附录

- 完整的 Iron-Fall 求解器 → CAIAO Server 映射表：`appendix/Iron-Fall-迁移映射表.md`
- Iron-Fall 项目概述：`项目概述.md`
- 项目吸收完整操作指南：`../10-operations-manual/项目吸收完整操作指南.md`
