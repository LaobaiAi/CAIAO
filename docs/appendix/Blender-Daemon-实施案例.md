---
level: ★
audience: overview
abstract: Blender Daemon 架构的完整实施设计（含 7 步计划、bpy API 细节）
abstract_en: Complete Blender Daemon implementation design (including 7-step plan, bpy API details)
prerequisites: []
tags: [附录, Blender, Daemon]
---

# Blender Daemon 实施案例（附录）

> Blender 常驻服务架构的完整实施设计。
> 通用 Daemon 模式见正文：`../10-operations-manual/Blender-Daemon架构实施指南.md`

---

## 一、当前架构的问题（量化）

### 现状

每个 Blender 功能 Server（build/animate/machinery/render）各自通过 subprocess.run() 冷启动 Blender 进程，跑完退出。Server 之间通过磁盘上的 .blend 文件交接状态。

### 量化影响

- 4 次 Blender 冷启动（每次 2-5 秒）
- 4 次 .blend 文件序列化/反序列化（139 个构件 × 元数据 = ~500KB 读写）
- 总计：约 8-20 秒纯开销（不含实际计算）

---

## 二、目标架构

### 核心思想

新增 blender_daemon_server（infrastructure, eager），维持一个 Blender 进程常驻。所有功能 Server 不再各自 subprocess.run，而是向同一个 daemon 发指令。

```
blender_environment_server（eager，提供路径/配置）
        │
blender_daemon_server（eager，维持 Blender 进程）
        │
        ├── blender_build_server → 读几何文件 → daemon.create_element() × N
        ├── blender_animate_server → 读拆除文件 → daemon.insert_keyframe() × N
        ├── blender_machinery_server → daemon.set_material() + daemon.create_element()
        └── blender_render_server → daemon.query_scene_state() → 渲染
```

### Daemon 暴露的细粒度工具

- create_element：创建一个构件（立方体/圆柱体）
- set_metadata：在构件上设置自定义属性
- insert_keyframe：在指定帧插入位置/缩放/可见性关键帧
- hide_object：隐藏构件
- set_material：设置材质
- query_scene_state：查询场景中所有构件状态
- save_blend：保存 .blend 文件
- render_frame：渲染单帧

### 关键约束

- bpy 非线程安全 → 所有指令串行执行，单队列
- 构建/拆除/渲染本身是顺序执行的，无冲突
- 一台机器只一个 Blender 进程

---

## 三、标准文件格式

### 几何参数文件

每种结构形式对应一个几何文件。内容为构件清单，每个构件包含：
- 标准元数据（element_type, floor, grid_x/y, importance, label）
- 位置（x, y, z）
- 尺寸（width, depth, height 或 radius, length）
- 旋转（rx, ry, rz）
- 材质名
- 类型特有扩展字段（放自己的命名空间下）

### 拆除参数文件

每种结构形式对应一个拆除文件。内容为工序清单，每步包含：
- 步骤标签（可读描述）
- 构件 ID 列表（引用几何文件中的构件）
- 时间帧（frame_start, frame_end）
- 过渡类型（flash→fall→explode→dust→settle）
- 效果配置（shake/dust/crack/smoke 的强度参数）

---

## 四、实施计划（7 步）

1. 创建 blender_daemon_server（infrastructure, eager）
2. 定义标准 Schema（几何文件 + 拆除文件 + 扩展字段规则）
3. 从现有项目中提取标准文件
4. 重构 build_server / animate_server（移除 Blender 子进程调用）
5. 移除各 Server 的 Blender 子进程管理（删除重复的 _find_blender() 等）
6. 引入参数扩展三机制（命名空间隔离 + Schema 注册表 + 三级分层）
7. 清理（删除已被标准文件替代的独立脚本）

---

## 五、参数扩展三机制（在 Blender 中的应用）

### 机制 1：命名空间隔离

- turbine.ridge_height（钢屋架特有）
- frame.bays_x（框架特有）
- plant.slab_load（厂房特有）

### 机制 2：Schema 注册表

参数文件声明扩展字段名和类型，Server 加载时校验合法性。未声明的扩展字段 → 警告并跳过。

### 机制 3：三级分层

| 层 | 定义 | 示例 | 处理方式 |
|----|------|------|---------|
| 基础层 | 所有结构共有 | element_id, position, size | 必须提供，Schema 强制校验 |
| 扩展层 | 某类结构特有 | turbine.ridge_height | 需在注册表声明，可选 |
| 透传层 | 上游不识别但下游可能需要 | metadata.custom_tag | 标记 transient，不校验 |

---

## 六、进程模型

| Server | 运行位置 | 理由 |
|--------|---------|------|
| blender_environment_server | 子进程 | 环境发现，轻量，可独立重启 |
| blender_daemon_server | 子进程 | 管理 Blender OS 进程生命周期，崩了影响可控 |
| blender_build_server | 考虑主进程 local handler | 纯编排（读文件 + 调 daemon），无计算 |
| blender_animate_server | 考虑主进程 local handler | 同上 |
| blender_machinery_server | 考虑主进程 local handler | 同上 |
| blender_render_server | 子进程 | 渲染是重量级操作，需要进程隔离 |

---

## 七、容错设计

1. Blender 进程崩溃：daemon 检测子进程退出 → 自动重启 → 重新加载最近的 .blend → 继续服务
2. 指令队列溢出：设置最大队列深度（如 1000），超出时返回错误
3. 健康检查：daemon 定期 ping Blender（执行空操作验证 bpy 可用）
4. 优雅关闭：收到 SIGTERM → 保存当前场景 → 关闭 Blender → 退出
