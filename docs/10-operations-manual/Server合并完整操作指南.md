---
level: ★★
audience: developer
abstract: Server 合并六步 SOP——画通信图、创建目录、导入逻辑、实现编排、MCP 接口、注册测试
prerequisites: [核心设计原则.md]
tags: [合并, 操作指南, SOP]
---

# Server 合并完整操作指南

> 基于参考实现中两次真实合并的完整操作流程。具体的 Server 名称和管线可根据不同项目替换。
> 当发现同一 Server 序列反复出现时，按此指南执行合并。

---

## 一、何时合并

满足以下**至少两个**条件时，考虑合并：

1. 同一 Server 序列在同一工作流中出现 ≥3 次
2. 序列中的 Server 调用总是顺序执行（非条件分支）
3. 合并后能消除 ≥2 次子进程通信
4. 序列的中间结果不需要单独暴露给 LLM
5. 源 Server 的纯逻辑是可导入的（不是黑盒子进程）

**不应该合并的情况**：
- 序列中有条件分支（if result X then call Y else Z）
- 用户经常需要单独使用序列中的某一台 Server
- 序列中的某台 Server 独立演进速度快于整体
- 源 Server 的逻辑无法作为纯函数导入

---

## 二、合并六步骤

### 步骤 1：绘制合并前后的通信图

明确画出合并前后的子进程通信次数变化。

合并前（以 Pipeline A 为例）：
3 次子进程调用 → 3 次 JSON 序列化 → 3 次 LLM 决策

合并后：
1 次子进程调用 → 1 次 JSON 序列化 → 1 次 LLM 决策

### 步骤 2：创建合并 Server 目录

```
servers/
└── <merged_server_name>/
    ├── server.py       # 合并后的 Server 实现
    └── caiao.yaml      # 清单文件
```

### 步骤 3：从源 Server 导入纯逻辑

核心原则：导入函数和类，不依赖源 Server 进程。

需要确认：
- 源模块路径是否正确
- 导入的函数自身不依赖子进程环境
- 函数签名与你需要的一致
- 如果没有合适的纯函数可导入，先从源 Server 中提取

需要添加 sys.path 处理（源模块可能不在 Python path 中）。

### 步骤 4：实现 _run_pipeline 编排函数

核心编排函数负责：
1. 参数验证和默认值填充
2. 顺序调用导入的逻辑函数
3. 在步骤间传递数据
4. 统一错误处理（任一步失败 → 整体失败）
5. 构建统一返回结果

**关键设计决策**：
- 参数映射：将合并工具的输入参数映射为各步骤需要的子参数
- 结果组合：将所有步骤的结果组合为单一返回字典
- 元数据附加：添加版本信息、时间戳、步骤摘要

### 步骤 5：实现 MCP 工具接口

将编排函数包装为 MCP call_tool 处理逻辑。需要：
- 在 `list_tools()` 中注册工具
- 在 `call_tool()` 中路由到编排函数
- 添加 caiao.yaml 清单

### 步骤 6：注册、测试、更新文档

1. 注册到 SERVER_CONFIGS 或 caiao.yaml（non-lazy，随 gateway 启动）
2. 更新 LLM System Prompt（标记为 PREFERRED 工具）
3. 更新 CAIAO_PROTOCOL.md（Server Registry + Merge Roadmap）
4. 更新 CLAUDE.md 和 ARCHITECTURE.md
5. 编写端到端测试
6. 保留旧的原子 Server 和 composite pipeline（向后兼容）

---

## 三、真实合并案例细节

> 以下两个合并案例来自参考实现，展示了合并的具体过程。Server 名称、涉及的模块和编排流程可根据不同项目替换。

### 合并 #1（示例）

**涉及的源 Server**：frame_generator + anastruct_server
**导入的内容**：
- 从 `frame_generator.core` 导入 `FrameGenerator` 类和 `FrameGeneratorConfig`
- 从 `anastruct_server.server` 导入 `_analyze_structure` 和 `_select_critical_element` 函数

**编排流程**：
生成框架配置 → 调用 FrameGenerator 生成 2D 分析就绪结构 → 调用分析函数 → 调用选柱函数 → 组合返回

**影响文件（9 个）**：
- 新建 1 个（server.py，83 行）
- 修改 8 个（main.py 注册、llm_engine.py 提示词、core.py 2D 节点加 z、前端类型更新、ARCHITECTURE.md 新建、README 更新、CLAUDE.md 更新）

### 合并 #2（示例）

**涉及的源 Server**：frame_generator + pynite_server
**关键创新**：内置 UnifiedFrame 转换器

**为什么需要转换器**：`generate_frame_3d` 的输出（柱/梁/板的几何描述）和 `pynite_analysis` 的输入（节点/单元/荷载/支撑的拓扑描述）使用完全不同的数据格式。转换器桥接了这个鸿沟。

**转换器的职责**：
- 坐标系重映射（几何 z_vert → 分析 y）
- 节点去重（梁柱交点精确合并）
- 几何→拓扑转换（柱/梁列表 → 节点/单元列表）
- 截面属性传递（E, A, Iy, Iz, J 从几何到单元）
- 默认荷载和支撑生成

**附带 14 个单元测试**验证了转换器的正确性。

---

## 四、合并 Server 的铁律

1. **不含领域计算逻辑**——所有计算来自导入的纯函数
2. **不修改源 Server**——合并创建新 Server，源 Server 保持不变
3. **保留旧 Server**——原子 Server 仍可供需要的用户单独使用
4. **统一错误处理**——任一步骤失败，整体返回失败
5. **返回统一结果**——一次响应包含前端需要的全部数据
6. **可独立运行**——合并 Server 自己的子进程，不依赖源 Server 进程

---

## 五、合并效果评估

合并完成后，对比以下指标：

| 指标 | 合并前 | 合并后 | 改善 |
|------|--------|--------|------|
| 子进程通信次数 | N 次 | 1 次 | N-1 次 |
| JSON 序列化次数 | N 次 | 1 次 | N-1 次 |
| LLM 决策次数 | N 次 | 1 次 | N-1 次 |
| 原子性 | 部分失败风险 | 全有或全无 | ✅ |
| 延迟 | ~T×N + IPC×N | ~T total | ~IPC×(N-1) |

---

## 六、常见陷阱

| 陷阱 | 预防措施 |
|------|---------|
| 源模块导入失败（路径问题） | 在 server.py 顶部处理 sys.path |
| 子步骤的依赖数据格式不一致 | 在编排函数中显式转换（或写 converter） |
| 合并后的返回数据太大 | 添加结果裁剪（只传关键字段给前端） |
| 源 Server 更新后合并 Server 没同步 | 合并 Server 通过 import 引用源逻辑——自动同步 |
| 合并粒度过大（5+ Server 合并为 1） | 定期评估：合并后是否仍然「单一职责」 |
