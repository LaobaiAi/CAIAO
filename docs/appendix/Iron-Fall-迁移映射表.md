---
level: ★
audience: overview
abstract: Iron-Fall 12 个求解器到 CAIAO Server 的完整映射表
abstract_en: Complete mapping table of 12 Iron-Fall solvers to CAIAO Servers
prerequisites: []
tags: [附录, 迁移, 映射]
---

# Iron-Fall → CAIAO 迁移映射表（附录）

> 求解器到 CAIAO Server 的完整映射关系。
> 通用迁移方法论见正文：`../06-iron-fall-reference/向CAIAO迁移的路径.md`

---

## 求解器 → CAIAO Server 映射

| 源求解器 | 对应 CAIAO Server | 迁移状态 |
|:---|:---|:---:|
| 结构分析适配器（anaStruct） | anastruct_server | ✅ 已完成 |
| OpenSees 求解器 | opensees_server | ✅ 已完成 |
| 拆除序列编排器 | planning_server | ✅ 已完成 |
| AI Agent（LangChain） | gateway Agent Loop（ReAct） | ✅ 已完成 |
| 多智能体辩论系统 | comparison_server | ✅ 已完成 |
| 预计算模块 | quick_analysis_server（合并 Server） | ✅ 已完成 |
| 深度分析（Pushover/非线性） | 待迁移 | ❌ |
| 可解释 AI 分析器 | 待迁移 | ❌ |
| 强化学习规划器（PPO） | 待迁移 | ❌ |
| 烟囱稳定性分析 | 待迁移 | ❌ |
| 烟囱 OpenSees 分析 | 待迁移 | ❌ |
| 力场可视化 | 前端已实现 | ✅ 已替代 |

---

## 通信协议迁移细节

| 迁移前 | 迁移后 |
|:---|:---|
| REST 端点（40+） | 仅 WebSocket + 少量 REST |
| WebSocket 自定义端点 | CAIAO Hub 路由 |
| 自定义消息类型 | MCP JSON-RPC |
| Python dict over WebSocket | TextContent JSON over stdio |

---

## 数据模型迁移细节

| 迁移前（IFCS Pydantic） | 迁移后（CAIAO） |
|:---|:---|
| Node | generate_frame 输出中的 node 对象 |
| Element | generate_frame 输出中的 element 对象 |
| Section | 各 Server 内置的截面数据 |
| Material | list_materials 工具输出 |
| StructureModel | generate_frame / generate_frame_3d 输出 |
| AnalysisResult | analyze_frame / run_analysis 输出 |
| DemolitionAction | apply_demolition_action 输入参数 |
| DemolitionPlan | plan_demolition_sequence 输出 |

---

## 未迁移模块的建议

### 深度分析（Pushover/非线性）
- 创建 deep_analysis_server
- 工具：run_pushover_analysis、analyze_collapse_mechanism
- 引擎：OpenSeesPy
- 启动：lazy，计算型

### 可解释 AI 分析器
- 创建 xai_server
- 工具：explain_decision、generate_decision_tree
- 启动：lazy

### 强化学习规划器（PPO）
- 创建 rl_planner_server
- 工具：train_rl_policy、get_rl_demolition_plan
- 启动：lazy，计算型

### 烟囱分析
- 创建 chimney_server
- 工具：analyze_chimney_stability、simulate_chimney_topple
- 启动：lazy，计算型
