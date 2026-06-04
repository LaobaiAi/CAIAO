---
level: ★
audience: overview
abstract: CAIAO Server 功能分类框架与设计模式速查，完整清单见附录
prerequisites: []
tags: [Server, 目录, 分类]
---

# Server 目录与分类

> CAIAO Server 按功能领域分为若干大类。完整的参考实现 Server 清单见附录：`appendix/全部Server清单-参考实现.md`。
> Server 种类（atomic / composite / infrastructure）说明见：`Server种类说明.md`。

---

## 一、Server 功能分类框架

任何 CAIAO 项目的 Server 通常可归入以下类别：

| 类别 | 职责 | 典型工具 |
|------|------|---------|
| **分析引擎** | 执行领域核心计算（求解器、仿真引擎） | 结构分析、流体仿真、优化计算 |
| **几何与模型生成** | 参数化生成领域模型 | 框架生成、BIM 建模、网格划分 |
| **校验与报告** | 领域标准校核、结果评估、报告输出 | 规范校核、报告生成 |
| **规划与编排** | 多步骤任务规划、策略对比 | 序列规划、多方案比较、流程编排 |
| **可视化与渲染** | 2D/3D 可视化、动画、渲染 | 场景构建、动画控制、渲染输出 |
| **AI 集成** | LLM 调用、参数提取、语义理解 | 对话接口、参数解析、知识检索 |
| **元管理** | Server 生命周期管理、健康检查、编排优化 | Server 创建、健康监控、合并检测 |

---

## 二、Server 设计模式速查

常用的 Server 组织模式（详见 `Server设计模式.md`）：

1. **原子 Server**：单一职责，纯计算，输入 → 输出
2. **合并 Server**：导入多个源 Server 的纯逻辑，编排为一次调用
3. **编排 Server（composite）**：声明式 YAML 管线，仅做数据传递
4. **基础设施 Server（infrastructure）**：管理共享运行时环境
5. **Daemon Server**：维持外部工具进程常驻，暴露原子指令

---

## 三、附录

- 完整的参考实现 Server 清单（含工具名、引擎、状态）：`appendix/全部Server清单-参考实现.md`
