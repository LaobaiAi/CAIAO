---
level: ★
audience: overview
abstract: StructureClaw 6 个技能包到 CAIAO Server 的完整蒸馏映射表
prerequisites: []
tags: [附录, 蒸馏, 映射]
---

# StructureClaw 蒸馏映射表（附录）

> 从 StructureClaw 项目的 6 个技能包到 CAIAO Server 的完整蒸馏映射。
> 通用蒸馏方法论见正文：`../06-iron-fall-reference/StructureClaw蒸馏源参考.md` 和 `../05-dev-guides/蒸馏方法论.md`

---

## StructureClaw 简介

一个 AI 辅助结构工程的开源项目（TypeScript + Next.js + LangGraph + Python 分析），覆盖结构设计全流程——建模、分析、校核、报告。作为 CAIAO 轻量实现项目的蒸馏源。

---

## 定位差异

| 维度 | CAIAO 参考实现 | StructureClaw |
|------|--------------|---------------|
| 核心场景 | 渐进式建筑拆除模拟 | 结构设计全流程（建模→分析→校核→报告） |
| 技术栈 | Python + Next.js + CAIAO | TypeScript + Next.js + LangGraph + Python |
| 架构核心 | CAIAO Server（MCP stdio）多进程 | LangGraph Agent + Skill/Tool 双层架构 |
| 分析引擎 | 多个结构分析求解器 | OpenSees + 国产设计软件 |
| 可视化 | SVG 2D + 3D 引擎 | 待定 |

---

## 蒸馏映射表

| 源技能包 | 蒸馏产物 | CAIAO Server | 关键取舍 |
|:---|:---|:---|:---|
| structure-type：框架 + 截面 | 参数化建模 | 结构生成 Server | 规则网格、有限截面硬编码 |
| load-boundary | 荷载施加 | 荷载生成 Server | 简化从属面积法 |
| analysis（OpenSees） | 有限元分析 | 分析运行 Server | 自研算法替代外部依赖 |
| code-check | 规范校核 | 规范校核 Server | 核心公式简化实现 |
| report | 报告生成 | 报告生成 Server | 模板引擎 + fallback |
| — | 流程编排 | 流程编排 Server（合并） | 仅编排，无领域逻辑 |

---

## 关键取舍原则

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 核心算法 | 自研实现 | 零安装门槛 |
| 荷载计算 | 简化等效法 | 演示精度足够 |
| 规范校核 | 核心公式 + 预留扩展 | 覆盖主要场景 |
| Server 通信 | 进程内直调 | 开发效率优先 |
| 报告生成 | 模板 + 字符串 fallback | 环境受限时仍可工作 |
| 数据管理 | 硬编码内置 | 无文件依赖 |

---

## 参考资源

- StructureClaw GitHub：https://github.com/structureclaw/structureclaw
- 迁移日志和适配经验：参考实现项目的 dev-notes 目录
