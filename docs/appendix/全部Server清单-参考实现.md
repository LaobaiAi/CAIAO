---
level: ★
audience: overview
abstract: 参考实现的完整 Server 清单（含工具名、引擎、状态）
prerequisites: []
tags: [附录, Server, 参考]
---

# 全部 CAIAO Server 清单

> 覆盖三个项目的全部 Server，共 34+ 个。
> 项目标记：🏗️ 拆除模拟器 | 🏭 钢框架设计 | ⚒️ Iron-Fall（无 CAIAO，此处列求解器）

---

## 一、结构分析引擎

| Server | 项目 | 种类 | 引擎 | 工具 | 状态 |
|--------|------|------|------|------|------|
| `anastruct_server` | 🏗️ | atomic-mcp | anaStruct | `generate_simple_frame`, `analyze_frame`, `select_critical_element` | active |
| `opensees_server` | 🏗️ | atomic-mcp (lazy) | OpenSeesPy | `high_fidelity_analysis` | active |
| `pynite_server` | 🏗️ | atomic-mcp (lazy) | PyNiteFEA | `pynite_analysis` | active |
| `fapp_server` | 🏗️ | atomic-mcp (lazy) | FAPP | `fapp_analysis` | active |
| `abaqus_session_server` | 🏗️ | merged (lazy) | Abaqus CAE | 15 tools（见下文） | active |
| `OpenSeesRunner` | 🏭 | 原子（计算） | 自研矩阵位移法 | `run_analysis` | active |

### abaqus_session_server 工具清单（15 tools）

建模（5）：`create_rectangular_column`, `create_truss`, `create_slab`, `assign_concrete_cdp`, `mesh_part`
分析（4）：`create_explicit_step`, `apply_gravity`, `create_rigid_ground`, `submit_job`
结果（2）：`get_max_displacement`, `plot_displacement_curve`
拆除（2）：`create_cut_zone`, `inject_cut_zone_inp`
管线（2）：`build_factory`, `setup_collapse`

---

## 二、几何建模与框架生成

| Server | 项目 | 种类 | 工具 | 状态 |
|--------|------|------|------|------|
| `frame_generator` | 🏗️ | atomic-mcp | `generate_frame`, `generate_frame_3d`, `generate_from_text`, `list_materials` | active |
| `bim_model_server` | 🏗️ | atomic-mcp (lazy) | `generate_steel_frame`, `generate_concrete_structure`, `generate_hybrid_structure`, `export_ifc` | active |
| `blender_build_server` | 🏗️ | atomic-mcp (lazy) | `build_frame_model` | active |
| `SteelFrameGenerator` | 🏭 | 原子（计算） | `generate_frame` | active |
| `SteelLoadGenerator` | 🏭 | 原子（计算） | `apply_loads` | active |
| `ThreeDExporter` | 🏭 | 原子 | `export_3d_model` | active |

---

## 三、规范校核与报告

| Server | 项目 | 种类 | 工具 | 状态 |
|--------|------|------|------|------|
| `SteelCodeCheck` | 🏭 | 原子（计算） | `check_code`（GB50017 强度、稳定、长细比、挠度） | active |
| `ReportGenerator` | 🏭 | 原子 | `generate_report`（Jinja2 + 字符串 fallback） | active |

---

## 四、拆除规划与动画

| Server | 项目 | 种类 | 工具 | 状态 |
|--------|------|------|------|------|
| `planning_server` | 🏗️ | atomic-mcp (lazy) | `plan_demolition_sequence`, `analyze_structure_topology`, `get_demolition_plan_summary`, `compute_collapse_chain` | active |
| `animation_control_server` | 🏗️ | atomic-mcp (lazy) | `create_timeline`, `get_timeline_state`, `sequence_to_animation_data`, `generate_effects_config` | active |
| `physics_server` | 🏗️ | atomic-mcp (lazy) | `init_physics_scene`, `apply_demolition_action`, `step_physics`, `get_physics_state`, `reset_physics` | active |
| `comparison_server` | 🏗️ | atomic-mcp (lazy) | `compare_demolition_strategies`, `get_comparison_summary`, `recommend_strategy` | active |

### planning_server 拆除策略

- `top_down`：从顶层开始，板→梁→柱，逐层向下（最安全）
- `bottom_up`：从底层开始，柱→梁→板，向上推进（最危险）
- `sequential`：按 ID 顺序逐个拆除
- `llm`：基于模板的智能规划，含外围/核心和分楼层策略

### comparison_server 评分体系

- safety_score（0-100），权重 0.5
- efficiency_score（0-100），权重 0.3
- visual_score（0-100），权重 0.2
- 推荐规则：低应力→sequential，高应力→top_down，不规则→llm，低层→bottom_up

---

## 五、3D 可视化（Blender 管线）

| Server | 项目 | 种类 | 引擎 | 工具 | 状态 |
|--------|------|------|------|------|------|
| `blender_environment_server` | 🏗️ | infrastructure (eager) | 纯 Python | `resolve_blender_path`, `validate_environment`, `provide_pipeline_paths`, `provide_config` | active |
| `blender_build_server` | 🏗️ | atomic-mcp (lazy) | Blender 4.2+ (bpy) | `build_frame_model` | active |
| `blender_animate_server` | 🏗️ | atomic-mcp (lazy) | Blender 4.2+ (bpy) | `apply_demolition_sequence` | active |
| `blender_machinery_server` | 🏗️ | atomic-mcp (lazy) | Blender 4.2+ (bpy) | `add_construction_machinery` | active |
| `blender_render_server` | 🏗️ | atomic-mcp (lazy) | Blender 4.2+ (OpenGL) | `render_animation`, `render_preview` | active |
| `blender_pipeline_server` | 🏗️ | atomic-mcp (lazy) | — | `run_full_pipeline`, `run_pipeline_stage`, `check_blender_environment` | active |

### Blender 管线流

```
blender_environment_server (eager, 提供路径/配置)
        │
        ├─→ blender_build_server:    build_frame_model → scene_base.blend
        ├─→ blender_animate_server:  apply_demolition_sequence → scene_animated.blend
        ├─→ blender_machinery_server: add_construction_machinery → scene_final.blend
        └─→ blender_render_server:   render_animation → MP4 (H.264, 720p, 24fps)

blender_pipeline_server (编排上述 4 步，可跳步)
```

---

## 六、Abaqus 倒塌管线

| Server | 项目 | 种类 | 工具 | 状态 |
|--------|------|------|------|------|
| `abaqus_environment_server` | 🏗️ | infrastructure (eager) | `resolve_abaqus_path`, `validate_environment`, `get_abaqus_config` | active |
| `abaqus_session_server` | 🏗️ | merged (lazy) | 15 tools（见上文） | active |
| `abaqus_collapse_pipeline` | 🏗️ | composite | `run_abaqus_collapse` | active |

---

## 七、Unity 3D 实时可视化

| Server | 项目 | 种类 | 工具 | 状态 |
|--------|------|------|------|------|
| `unity_simulator` | 🏗️ | atomic-mcp (lazy) | `apply_demolition_action`, `modify_structure`, `get_structure_status`, `get_removed_elements` | active |

通过 TCP :5005 与 Unity Editor 通信，WebRTC 视频流到前端。

---

## 八、AI 集成

| Server | 项目 | 种类 | 工具 | 状态 |
|--------|------|------|------|------|
| `LLMGateway` | 🏭 | 原子（网络） | `chat_completion`, `stream_chat` | active |
| `LLMParamExtractor` | 🏭 | 原子（计算） | `extract_params_from_text`（Hub 感知，通过 Hub 调 LLM Gateway） | active |

LLM 三层架构（钢框架设计）：

```
编排层: LLMAgentOrchestrator (合并 Server, 纯编排, ReAct 循环)
  └─→ Hub.call_tool("chat_completion", ...)
计算层: LLMParamExtractor (原子 Server, 纯计算: JSON 解析/校验/填充默认值)
  └─→ Hub.call_tool("chat_completion", ...)
通信层: LLMGateway (原子 Server, ★唯一网络层)
```

---

## 九、编排与管线

| Server | 项目 | 种类 | 工具 | 状态 |
|--------|------|------|------|------|
| `quick_analysis_server` | 🏗️ | merged | `quick_analysis`（Pipeline A: 生成→分析→选关键柱，三步合一） | active |
| `full_analysis_3d_server` | 🏗️ | merged | `full_analysis_3d`（Pipeline B: 生成 3D→转换→PyNite 分析→选关键柱 3D） | active |
| `run_full_analysis` | 🏗️ | composite | pipeline（generate→analyze→select_critical，Legacy） | legacy |
| `full_bim_demolition` | 🏗️ | composite | pipeline（BIM→plan→animation timeline） | active |
| `abaqus_collapse_pipeline` | 🏗️ | composite | `run_abaqus_collapse` | active |
| `SteelFramePipeline` | 🏭 | 合并 | `run_full_pipeline`（建模→荷载→分析→校核→报告） | active |
| `CliOrchestrator` | 🏭 | 合并 | `run_cli_command`（3 模式：engineering/llm-param/llm-agent） | active |
| `LLMAgentOrchestrator` | 🏭 | 合并 | `execute_with_llm`（ReAct 循环，动态工具发现） | active |
| `WebAPIServer` | 🏭 | 合并 | `run_pipeline`, `llm_param`, `llm_agent` 等 | active |

---

## 十、元管理与辅助

| Server | 项目 | 种类 | 工具 | 状态 |
|--------|------|------|------|------|
| `manager_server` | 🏗️ | atomic-mcp (eager) | 24 tools，6 组（创建/扩展/增强/迁移/检索/编排） | active |
| `scenario_server` | 🏗️ | atomic-mcp (lazy) | `list_scenarios`, `get_scenario`, `recommend_scenario` | active |

### manager_server 工具分组

- **创建（4）**：`create_server`, `list_archetypes`, `generate_manifest`, `validate_server`
- **扩展（4）**：`add_tool`, `update_tool`, `remove_tool`, `add_import`
- **增强（4）**：`health_check`, `get_metrics`, `restart_server`, `configure_health`
- **迁移（4）**：`rename_server`, `bump_version`, `archive_server`, `migrate_to_manifest`
- **检索（5）**：`search_capabilities`, `list_servers`, `get_server`, `find_tool_owner`, `build_search_index`
- **编排（3）**：`detect_merge_opportunities`, `analyze_dependency_graph`, `suggest_pipeline`

---

## 十一、Iron-Fall 求解器（无 CAIAO 封装，列作对照）

| 求解器 | 文件 | 功能 | 延迟 |
|--------|------|------|------|
| anaStruct 适配器 | `backend/engine/anastruct_adapter.py` | 快速弹性分析 | <200ms |
| Frame3DD 适配器 | `backend/engine/frame3dd.py` | 3D 静力/动力分析 | <2s |
| OpenSeesPy 适配器 | `backend/engine/opensees.py` | 深度非线性分析 | <5s |
| 序列生成器 | `backend/engine/sequencer.py` | 图论拆除序列 | — |
| 深度分析 | `backend/engine/deep_analysis.py` | Pushover/深度非线性 | — |
| XAI 分析器 | `backend/engine/xai_analyzer.py` | 可解释 AI | — |
| RL Agent | `backend/engine/rl_agent.py` | PPO 强化学习 | — |
| LangChain Agent | `backend/agent/agent.py` | ReAct 拆除决策 | — |
| Multi-Agent | `backend/agent/multi_agent.py` | 规划/安全/经济三方辩论 | — |

这些求解器是当前拆除模拟器中对应 CAIAO Server 的「前身」——功能相同，但未封装为独立 Server。

---

## Server 总数统计

| 项目 | atomic-mcp/原子 | merged/合并 | composite | infrastructure | 合计 |
|------|:---:|:---:|:---:|:---:|:---:|
| 🏗️ 拆除模拟器 | 15 | 2 | 3 | 2 | **22** |
| 🏭 钢框架设计 | 8 | 4 | 0 | 0 | **12** |
| ⚒️ Iron-Fall | — | — | — | — | 9（求解器，非 Server） |
