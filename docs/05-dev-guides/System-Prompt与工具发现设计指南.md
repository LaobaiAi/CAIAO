---
level: ★★★
audience: architect
abstract: LLM 工具发现的两层设计、System Prompt 五条原则、Agent Loop 实现模式
abstract_en: Two-layer LLM tool discovery design, five System Prompt principles, Agent Loop implementation patterns
prerequisites: [CAIAO概述.md]
tags: [System-Prompt, LLM, Agent-Loop, 工具发现]
---

# System Prompt 与工具发现设计指南

> LLM 如何知道有哪些工具、何时调用哪个工具——这是 CAIAO 架构中「AI 原生」原则的核心体现。
> 基于拆除模拟器 `gateway/llm_engine.py` 的 SYSTEM_PROMPT 和钢框架设计的工具发现机制。

---

## 一、工具发现的两层机制

### 静态注册（System Prompt）

SYSTEM_PROMPT 中包含完整的工具目录，按能力域分组。LLM 在每次推理时都能看到所有可用工具及其用途。

**分组原则**：
- 按能力域分组（分析管线、框架生成、BIM 建模、拆除规划、动画、物理仿真）
- 标注首选项（标记 PREFERRED 工具，引导 LLM 优先选择）
- 标注 Legacy（已废弃但保留的工具）
- 每个工具一行：工具名 + 适用范围 + 一句话说明

**示例结构**（参考实现的 System Prompt 工具目录）：
- 分析管线（preferred entry points）：data_pipeline（2D）、data_pipeline_3d（3D）
- 数据生成：generate_from_text（自然语言首选）、generate_data、generate_data_3d
- 建模工具：build_model_variant_a、build_model_variant_b、build_model_variant_c、export_standard
- 编排规划：plan_sequence（多策略）、analyze_topology
- 动画控制：create_timeline、sequence_to_animation、generate_effects_config
- 物理仿真：init_scene、step_physics、get_state
- 策略对比：compare_strategies（多策略并行生成 + 排名）

### 动态发现（Hub.list_all_tools()）

LLM Agent 编排器在运行时通过 Hub 动态发现工具，不硬编码工具列表。

**实现位置**：`llm_agent_orchestrator.py` 的 `_discover_tools_from_hub()`

**流程**：
1. 从 Hub 获取所有已注册工具
2. 过滤掉编排器自身的工具（避免递归调用）
3. 转换为 OpenAI function calling 格式
4. 同时生成人类可读的工具描述文本（注入 System Prompt 模板）

**优势**：
- 新增 Server 不需要更新 System Prompt
- Agent 自动感知工具变化
- 工具描述由 Server 自行维护（单一真源）

---

## 二、System Prompt 设计原则

### 原则 1：分组引导

不要按字母排序工具。按 LLM 完成任务的自然顺序分组。LLM 会更倾向于选择分组内的工具链路。

### 原则 2：标注首选

在多个工具能做同一件事时，明确标注首选。用 PREFERRED、推荐等标记引导 LLM 做出正确选择。

### 原则 3：渐进式信息密度

- 第一层：工具名 + 一句话（System Prompt 中）
- 第二层：完整描述 + JSON Schema（工具定义中）
- LLM 先用第一层决策，确定要调用哪个工具后再看第二层参数

### 原则 4：工具描述是用户界面

在传统软件中，用户界面是按钮和表单。在 CAIAO 中，用户界面是工具描述和 JSON Schema——LLM 通过它们理解和调用工具。描述不清的工具就是不可用的工具。

**好的描述**：
- 包含「调用时机」
- 包含「适用条件」
- 包含「输入含义」和「输出含义」
- 不包含实现细节

### 原则 5：静态 vs 动态的分工

| | 静态注册（System Prompt） | 动态发现（Hub.list_all_tools） |
|---|---|---|
| 何时更新 | 手动维护 | 自动感知 |
| 信息粒度 | 工具名 + 一句话 | 完整描述 + Schema |
| 适用场景 | 核心、稳定的工具 | 所有工具（包括临时/实验性） |
| 维护负担 | 需手动同步 | 零维护 |

**建议**：System Prompt 中保留核心工具的静态目录（作为 LLM 的「快捷方式」），同时 Agent 编排器使用动态发现获取完整工具列表。

---

## 三、Agent Loop 实现模式

基于网关 Agent 循环模块的 ReAct 循环实现。

### 核心流程

ReAct 循环 = think（LLM 推理）→ act（工具调用）→ observe（结果反馈）

关键参数：
- 设置合理的工具调用上限（避免无限循环，兼顾复杂任务）
- 在适当轮次后触发重新规划（强制 LLM 总结已获得的信息，重新评估下一步）

### 工具结果缓存

相同工具名 + 相同参数 → 复用缓存结果，避免重复调用。缓存键 = 工具名 + 排序后的 JSON 参数。

### 取消/暂停/恢复信号

通过 asyncio.Event 实现：
- cancel_event：停止 Agent 循环（用户点击「停止生成」）
- pause_event / resume_event：暂停和恢复（用于对话切换等场景）

### 智能摘要

工具结果摘要后回传 LLM（而非完整 JSON），节省 80-90% Token。每种工具类型有专门定制的摘要逻辑。

### 流式输出

LLM 的思考过程、工具调用的执行结果、最终回复——全部通过 WebSocket 逐步推送到前端。用户看到的是实时渐进式响应，而非等待所有步骤完成后才显示。

---

## 四、设计工具描述的实用建议

1. **描述应该让 AI 知道「何时调用」**——不仅是「这个工具做什么」，更是「在什么情况下应该选择这个工具」
2. **枚举值应该自解释**——如果参数有 enum，每个值都应该有描述
3. **默认值要合理**——减少 LLM 的决策负担
4. **避免歧义**——两个工具不要有重叠的能力范围。如果重叠不可避免，在 System Prompt 中标注首选
5. **Schema 中的 description 是可发现性的关键**——LLM 在决定调用哪个工具时会读取它们
