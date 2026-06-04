---
level: ★
audience: overview
abstract: 从零启动 CAIAO 项目的完整指南——15 分钟初始化、30 分钟第一台 Server、渐进式复杂度路线
prerequisites: [CAIAO概述.md]
tags: [入门, 启动, 新项目]
---

# 新项目 CAIAO 化启动指南

> 从零开始一个 CAIAO 原生项目的完整操作手册。
> 按此指南开发的项目，将来吸收成本为零。

---

## 一、项目初始化（15 分钟）

### 选择实现路径

快速决策：
- 项目最终需要被外部 AI 客户端调用？→ MCP SDK 实现
- 项目是独立工具/CLI？→ 轻量实现
- 不确定？→ 轻量实现（后续可零成本迁移）

### 轻量实现初始化

1. 复制 `caiao_lightweight/` 下三个文件到项目目录：
   - `server.py` — Server 基类 + @tool 装饰器
   - `hub.py` — 同步 Hub
   - `subprocess.py` — 子进程管理器
2. 创建目录结构：`servers/`、`tests/`
3. 创建 `servers/defaults.py`——项目中所有默认值的唯一来源

### MCP SDK 实现初始化

1. 确保 `mcp>=1.0.0` 已安装
2. 安装 CAIAO 框架包：`pip install "git+https://github.com/LaobaiAi/CAIAO.git#subdirectory=caiao"`
3. 或使用 CLI 生成项目骨架：
   ```bash
   caiao init my-project
   cd my-project
   caiao new server my-solver
   ```
   生成后即含 `caiao.yaml` 清单和 `server.py` 骨架。

---

## 二、第一台 Server（30 分钟）

### 识别第一台 Server

问：项目的核心能力是什么？把它拆成最原子的步骤。第一步就是你的第一台 Server。

示例：
- 结构分析项目 → 框架生成器
- 数据处理项目 → 数据加载器
- 可视化项目 → 模型构建器

### 实现（轻量版本）

1. 在 `servers/` 下创建 `.py` 文件
2. 继承 `CAIAOServer`
3. 设置类级元信息（server_name, server_category, server_type）
4. 用 `@tool` 装饰器注册第一个工具
5. 实现核心逻辑（纯 Python，最低依赖）
6. 在 `__main__` 块提供 CLI 入口
7. 用 CLI 测试：`python servers/my_server.py`

### 实现（MCP SDK 版本）

1. 运行 `caiao new server my-solver` 生成骨架
2. 修改 `list_tools()` 和 `call_tool()` 加入业务逻辑
3. 完善 `caiao.yaml` 清单中的描述和标签
4. 运行 `caiao validate` 校验
5. Hub 启动时自动发现并注册

---

## 三、领域边界划分（1-2 小时）

### 拆分原则

将全流程拆解为 3-6 个原子 Server：
- **单一职责**——一个 Server 只做一件事
- **无状态**——输入足够，不依赖外部隐式状态
- **可独立验证**——给定输入，输出可单独测试
- **自然边界**——沿领域知识边界切分

### 拆分参考

| 领域 | 典型拆分 |
|------|---------|
| 结构工程 | Generator → Loader → Analyzer → Checker → Reporter |
| 数据处理 | Loader → Cleaner → Transformer → Analyzer → Exporter |
| 可视化 | Builder → Animator → Decorator → Renderer |
| AI 集成 | Gateway（通信） → Extractor（计算） → Orchestrator（编排） |

---

## 四、从第一天就遵循的约定

### 约定 1：共享默认值单源

创建 `servers/defaults.py`，所有 Server 从此导入默认值。不在任何 Server 的代码中硬编码默认值。

### 约定 2：构件元数据从创建时就打上

适用于所有创建「对象」的 Server。对象创建时立即设置标准元数据字段：
- 类型标识
- 位置/层级
- 重要性/优先级
- 可读标签

### 约定 3：声明式优于命令式

对于编排逻辑（如拆除序列、处理流程），优先使用声明式描述（策略 + 参数），而非硬编码步骤序列。

声明式 = 描述「要什么」（从顶层开始、按重要性排序）
命令式 = 描述「怎么做」（第 1 步拆 X、第 2 步拆 Y）

### 约定 4：命名空间预留

任何「可能以后有不同变体」的参数都用前缀隔离。零成本习惯，节省巨大重构工作量。

### 约定 5：走 CAIAO 路径测试

即使开发阶段，也通过最小的 CAIAO Server 来调用你的核心逻辑。不要绕过 Hub 直接测试。

### 约定 6：配置文件走标准 Schema

独有参数放自己的命名空间下，基础参数用标准字段名和层级结构。加一个类型标识字段以便自动发现。

---

## 五、渐进式复杂度路线

```
阶段 1：1 台 Server，进程内直调
   ↓ CLI 可运行，核心逻辑验证通过
阶段 2：3-6 台 Server，Hub 自动发现
   ↓ 全流程可编排，每台可独立测试
阶段 3：Pipeline Server 编排全流程
   ↓ 一键端到端运行
阶段 4：提取计算型 Server 为子进程
   ↓ 进程隔离，崩溃不相互影响
阶段 5（可选）：切换到 MCP SDK transport
   ↓ 可被外部 AI 客户端发现和调用
```

每个阶段都是增量式的，不需要重写。不要在阶段 1 就规划阶段 5 的复杂度。

---

## 六、快速参考

### 最小项目结构（轻量实现）

```
my-project/
├── server.py                  # CAIAOServer 基类（从 caiao_lightweight/ 复制）
├── hub.py                     # Hub（从 caiao_lightweight/ 复制）
├── subprocess.py              # SubprocessManager（从 caiao_lightweight/ 复制）
├── servers/
│   ├── defaults.py            # 共享默认值
│   ├── my_server_a.py         # 原子 Server A
│   ├── my_server_b.py         # 原子 Server B
│   └── my_pipeline.py         # 合并 Server
├── tests/
│   └── test_servers.py
└── main.py                    # 项目入口
```

### 最小项目结构（MCP SDK 实现）

```
my-project/
├── servers/
│   ├── my_server_a/
│   │   ├── server.py
│   │   └── caiao.yaml
│   └── my_server_b/
│       ├── server.py
│       └── caiao.yaml
├── main.py                    # Hub 初始化 + API 入口（从 gateway_main.py 模板改写）
├── caiao.yaml                 # 项目级配置
├── requirements.txt           # caiao, mcp, fastapi, ...
└── tests/
```

生成命令：`caiao init my-project`，然后 `caiao new server my_server_a`
