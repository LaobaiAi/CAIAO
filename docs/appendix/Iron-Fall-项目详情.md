---
level: ★
audience: overview
abstract: Iron-Fall 前身项目的完整详情（版本、阶段、KPI、数据模型、限制）
prerequisites: []
tags: [附录, Iron-Fall, 历史]
---

# Iron-Fall 项目详情（附录）

> Iron-Fall 是 CAIAO 体系的前身项目，一个智能钢结构拆除决策系统。
> 通用架构对比和方法论见正文：`../06-iron-fall-reference/项目概述.md`

---

## 项目身份

- 全称：Iron-Fall — 智能钢结构拆除决策系统
- 版本：v1.1.0（2026-05-21）
- 协议：MIT
- 定位：CAIAO 体系出现前的紧耦合架构版本

---

## 四阶段开发历程

### Phase 1：核心基建（v1.0.0）
- 集中式数据模型（Pydantic）：将节点、构件、截面、材料、拆除动作、分析结果统一定义
- 三级求解器级联：快速求解器（<200ms）→ 中速求解器（<2s）→ 深度求解器（<5s）
- 抽象求解器基类：定义校验模型、静力分析、动力分析、稳定性检查四个接口
- 40+ REST 端点 + WebSocket

### Phase 2：AI 决策引擎
- LangChain ReAct Agent 作为 AI 决策层
- 无 API Key 时的简化 Agent fallback
- 工具集：稳定性检查、倒塌预测、荷载路径分析、构件信息查询
- 向量数据库 RAG 知识库

### Phase 3：实时可视化
- 3D 前端（Unity PhysX 刚体动力学）
- 2D 降级方案（单文件 Web 应用）
- 力场热力图叠加

### Phase 4：多智能体进化（v1.1.0）
- 三方辩论：规划智能体 + 安全智能体 + 经济智能体
- 辩论协调器（多轮辩论达成共识）
- 案例知识库（10 个案例，5 维特征向量相似搜索）
- 强化学习 Agent 比较

---

## 数据模型（IFCS — Iron-Fall Core Schema）

集中式 Pydantic 模型，覆盖结构建模到分析结果全流程：

| 模型 | 关键字段 |
|------|----------|
| Node | id, x, y, z, restraint[6] |
| Element | id, node_i_id, node_j_id, section_id, material_id, type |
| Section | id, name, A, Iy, Iz, J |
| Material | id, name, E, fy, density |
| StructureModel | name, nodes, elements, sections, materials, loads, supports |
| DemolitionAction | element_id, action_type, reason |
| AnalysisResult | displacements, forces, stress_ratios, convergence |

---

## KPI 指标

| 指标 | 目标值 | 状态 |
|------|--------|------|
| 推演延迟 | ≤3s | 已达成 |
| 力学校验 | 双轨并行 | 已实现 |
| 可视化帧率 | ≥30 FPS | 已实现 |
| 多智能体框架 | 3 角色 | 已达成 |
| 案例库规模 | 10 案例 | 已达成 |
| 单元测试 | 32/32 通过 | 已达成 |

---

## 已知限制（v1.1.0）

- OpenSeesPy 需手动安装
- Frame3DD 需单独安装并添加到 PATH
- 仅支持简单钢框架结构
- 无 CAIAO 封装——求解器与业务逻辑耦合
