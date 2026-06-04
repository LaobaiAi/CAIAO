---
level: ★★
audience: developer
abstract: 四维度（复用/简化/效率/高度）代码审查方法论——扫描清单、执行流程、检查清单
prerequisites: [代码审查发现与质量评估.md]
tags: [审查, 简化, 代码质量]
---

# Simplify 审查操作指南

> 基于参考实现中两次正式 simplify 审查的实战经验。以下案例中的具体技术栈（Blender、Abaqus）是示例性的——审查的四个维度和方法论是通用的。每次重大代码变更后应运行此审查。

---

## 一、审查的四个维度

每次审查从四个角度独立审视代码变更：

| 维度 | 核心问题 | 关注点 |
|------|---------|--------|
| **Reuse** | 有没有重复代码可以合并？ | 相同逻辑出现 ≥2 次 |
| **Simplification** | 有没有可以删除的代码？ | 死代码、冗余包装、不必要的抽象 |
| **Efficiency** | 有没有性能浪费？ | 不必要的序列化、重复计算、低效 API |
| **Altitude** | 架构层面有没有问题？ | 代码分叉、架构偏离、设计不一致 |

---

## 二、审查执行流程

### 阶段 1：确定审查范围

明确：
- 哪些文件被修改/新增？
- 变更量（行数、文件数）
- 变更的性质（新功能 vs 重构 vs 吸收）

### 阶段 2：四个维度扫描

每个维度独立扫描所有变更文件。

**Reuse 扫描清单**：
- 多个文件中有相同的函数定义？
- 多个 Server 各自实现了相同的能力（如发现外部二进制、读取配置）？
- 多个文件中有相同的常量或配置？
- 相同的 import 模式出现 ≥3 次？

**Simplification 扫描清单**：
- 有没有只在一个地方调用的 CLI 入口？
- 有没有只转发调用不加逻辑的包装函数？
- 有没有定义了但未被调用的变量/函数/import？
- 有没有注释掉的代码块？

**Efficiency 扫描清单**：
- 有没有低效的 API 调用（如 bpy.ops 替代 bpy.data）？
- 有没有不必要的序列化/反序列化？
- 有没有可以缓存/共享的重复计算？
- 有没有可以合并的多步子进程调用？

**Altitude 扫描清单**：
- 有没有与主项目架构不一致的设计？
- 有没有绕过 CAIAO Hub 的执行路径？
- 有没有平行代码库（copy-paste fork）？
- 有没有硬编码应该在配置中的内容？

### 阶段 3：判定和修复

对每个发现：
1. 判定：是真正的问题还是可接受的取舍？
2. 如果是问题：确定修复方案
3. 分优先级：P0（阻塞合并）→ P1（合并后立即修复）→ P2（下个迭代）

### 阶段 4：验证和记录

- 每个修复后运行相关测试
- 更新相关文档（CAIAO_PROTOCOL.md、CLAUDE.md）
- 写入 dev-notes 记录决策

---

## 三、审查案例一（来自参考实现，6 个问题）

### Issue 1: Reuse — Blender 发现逻辑重复

**发现**：5 个 Blender Server 各自实现了相同的 `_find_blender()`、`_run_blender_script()` 和路径常量。

**修复**：
- 创建 `blender_environment_server`（infrastructure, eager）——提供 Blender 发现、环境验证、路径提供
- 提取 `blender_pipeline/common.py`（系统 Python 侧）和 `_common.py`（Blender Python 侧）
- 所有 5 个功能 Server 改为从 common.py 导入

### Issue 2: Simplification — main_pipeline.py CLI

**发现**：`main_pipeline.py`（328 行）是 CLI 包装器，重复了 Blender 发现和阶段编排，完全绕过 CAIAO Hub。

**修复**：直接删除。开发者可通过 `blender --background --python <stage>.py` 单独运行各阶段。

### Issue 3: Efficiency — bpy.ops 操作符开销

**发现**：Blender 脚本大量使用 `bpy.ops.mesh.primitive_*`——每次调用推入 undo 栈、刷新 depsgraph、更新 UI 上下文。`scene.frame_set()` 触发完整 depsgraph 评估（约 695 次不必要的刷新）。

**修复**：
- 采用低级 `bpy.data` API：`mesh.from_pydata()` + `mesh.transform()`
- 相同尺寸对象共享 mesh 数据（139 个对象 → ~5-10 个 mesh 数据块）
- `scene.frame_set()` → `keyframe_insert(frame=N)`
- 消除约 695 次 depsgraph 评估

### Issue 4: Altitude — 蒸汽轮机平行代码库

**发现**：`blender_pipeline/projects/steam_turbine_building/` 是完全独立项目——自己的脚本、配置、执行路径，无共享代码。标记为 copy-paste fork。

**修复**：Blender Daemon 架构重设计（设计确认，实施待定）：
- 新增 `blender_daemon_server`（单持久 Blender 进程）
- 标准文件格式（每种结构 = 几何清单 + 拆除序列）
- Server 变成文件读取器 + 验证器 + daemon 转发器

### Issue 5: Simplification — caiao.yaml 样板重复

**发现**：6 个 Blender Server 的 caiao.yaml 重复相同的 command、health、dependencies、capabilities 块。

**修复**：`caiao/discovery.py` 的 `_manifest_to_config()` 添加默认值生成——每个清单只保留唯一字段。共减少约 120 行样板。

### Issue 6: Efficiency — Blender 冷启动

**发现**：4 个功能 Server 各自 `subprocess.run()` 冷启动 Blender 进程。Server 间通过磁盘 .blend 文件交接状态。四次冷启动 + 四道文件序列化。

**修复**：并入 Issue 4 的 Blender Daemon 方案——一个持久 Blender 进程，所有 Server 共享。

---

## 四、审查案例二（来自参考实现，3 个问题）

### Issue 1: Dead variable

**发现**：`abaqus_session.py` 中有一个构造后从未使用的变量。

**修复**：删除。

### Issue 2: Ineffective模块加载

**发现**：`abaqus_session_server/server.py` 在模块级别 import 了 `abaqus_session`——但 `abaqus_session` 只能在 Abaqus Python 中导入，系统 Python 中 `import abaqus_session` 会失败（因为 `abaqus_session.py` 顶部的 `from abaqus import ...`）。

**修复**：移除模块级别的 import，改为在 spawn 子进程后通过 stdio 通信，不需要在系统 Python 中加载 Abaqus 模块。

### Issue 3: 缺少 __init__.py

**发现**：新创建的 Server 目录缺少 `__init__.py` 文件。

**修复**：添加标准的 `__init__.py`。

---

## 五、审查检查清单

每次代码变更后，逐项检查：

**Reuse**：
- 新代码中有与已有代码重复的 ≥5 行块？
- 多个 Server 各自实现了相同的工具能力？
- 多个文件中有相同的 import 集合？

**Simplification**：
- 有只在一个地方使用的 CLI/入口点？
- 有只做转发不加逻辑的包装层？
- 有未使用的变量、函数、import、文件？
- 有注释掉的代码？

**Efficiency**：
- 有低效 API 调用（bpy.ops、多次 JSON 序列化）？
- 有不必要的进程启动/文件 I/O？
- 有可以缓存的计算结果？

**Altitude**：
- 有绕过 CAIAO Hub 的执行路径？
- 有与主项目架构不一致的模式？
- 有独立于主项目的平行代码？
- 有硬编码应配置化的内容？
