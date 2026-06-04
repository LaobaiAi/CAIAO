# CAIAO 仓库治理规范

## 仓库信息

| 项目 | 内容 |
|------|------|
| **仓库名** | `CAIAO` |
| **描述** | CAIAO — Server-as-atomic-unit framework for tool orchestration. Turn every solver, tool, or external capability into an independent Server process. Add a new capability by writing one Server file and registering it — no core code changes. |
| **Topics** | `mcp` `server` `orchestration` `tool-framework` `ai-agent` `software-architecture` |
| **License** | MIT |
| **主页** | README.md（仓库根目录） |

---

## 仓库结构

```
caiao/                          ← GitHub 仓库根
├── README.md                   ← 项目主页：是什么、快速开始、双路径说明
├── GOVERNANCE.md               ← 本文档
├── caiao/                      ← MCP SDK 路径（pip-installable 包）
│   ├── README.md               ← MCP SDK 路径快速入门
│   ├── pyproject.toml
│   ├── __init__.py
│   ├── hub.py                  ← CAIAOClientHub
│   ├── discovery.py            ← 清单发现
│   ├── types.py
│   ├── _state.py
│   ├── _parallel.py
│   ├── _semantic.py
│   ├── py.typed
│   ├── cli/
│   │   ├── __init__.py
│   │   └── main.py             ← caiao 命令（init/new/validate/list/doctor）
│   └── templates/
│       ├── server/
│       ├── mcp_project/
│       └── lightweight_project/
├── caiao_lightweight/          ← 零依赖路径（三个文件，复制即用）
│   ├── README.md               ← 轻量路径快速入门
│   ├── __init__.py
│   ├── server.py               ← CAIAOServer 基类 + @tool 装饰器
│   ├── hub.py                  ← 同步 Hub（进程内 + 子进程）
│   └── subprocess.py           ← SubprocessManager（JSON-line 协议）
└── docs/                       ← 知识库文档
    ├── README.md               ← 文档索引入口
    ├── GOVERNANCE.md           ← 本文档
    ├── MANIFEST.yaml           ← AI 可读索引
    ├── 01-core-concepts/
    ├── 02-two-implementations/
    ├── 03-server-catalog/
    ├── 04-caiao-yaml-system/
    ├── 05-dev-guides/
    ├── 06-iron-fall-reference/
    ├── 07-protocol-reference/
    ├── 08-evolution-history/
    ├── 09-critique-and-reflection/
    ├── 10-operations-manual/
    └── appendix/
```

---

## 仓库定位

这是一个**框架 + 文档一体化仓库**，面向三类用户：

1. **想快速试试的人**：打开 `caiao_lightweight/`，复制三个文件到自己项目，看 README 的 quickstart
2. **想正式用的人**：`pip install "git+https://github.com/LaobaiAi/CAIAO.git#subdirectory=caiao"`，运行 `caiao init` 生成项目骨架，按文档开发
3. **想深入理解的人**：读 `docs/`，从 MANIFEST.yaml 索引开始，按等级标记定向深入

---

## 使用方式

### 轻量路径（零依赖）

```
# 复制 caiao_lightweight/ 下三个文件到项目目录
cp caiao_lightweight/server.py my-project/
cp caiao_lightweight/hub.py my-project/
cp caiao_lightweight/subprocess.py my-project/

# 在项目中写 Server
from server import CAIAOServer, tool
from hub import Hub
```

### MCP SDK 路径（pip install）

```
pip install "git+https://github.com/LaobaiAi/CAIAO.git#subdirectory=caiao"
caiao init my-project
cd my-project
caiao new server my-solver
# 编辑 servers/my-solver/server.py 加入业务逻辑
```

### 退场（不想要了）

```
pip uninstall caiao             # MCP SDK 路径
rm server.py hub.py subprocess.py  # 轻量路径
# 你的 Server 继续可用——它们是标准 MCP Server，不依赖 CAIAO
```

---

## 维护规范

### 什么需要更新

| 改了 | 需要同步 |
|------|---------|
| 框架代码（caiao/*.py） | 对应的 docs/ 文档章节 |
| 轻量代码（caiao_lightweight/*.py） | docs/02-two-implementations/ 轻量实现文档 |
| 新增 Server 设计模式 | docs/03-server-catalog/ 设计模式文档 |
| caiao.yaml 字段变更 | docs/04-caiao-yaml-system/ 清单规范 |
| CLI 命令变更 | caiao/README.md + docs/05-dev-guides/ 开发指南 |
| 新增操作流程 | docs/10-operations-manual/ 对应指南 |

### 版本号规则

框架包版本号在 `caiao/pyproject.toml` 和 `caiao/__init__.py` 中。遵循 SemVer：
- 主版本：不兼容的 API 变更（如契约规则变化）
- 次版本：向后兼容的新功能（如新增 CLI 命令）
- 修订版本：向后兼容的 Bug 修复

### 文档更新规则

- 框架代码和文档在同一 commit 中变更，保持版本一致
- 重大设计决策写入 docs/08-evolution-history/ 版本演进
- 每个文件的 frontmatter 中的 `level` 和 `prerequisites` 随内容变化而调整
- MANIFEST.yaml 随文件增删同步更新

### Issue 标签建议

| 标签 | 用途 |
|------|------|
| `framework` | 框架代码（caiao/、caiao_lightweight/） |
| `docs` | 知识库文档 |
| `bug` | 框架代码的 Bug |
| `enhancement` | 功能请求 |
| `question` | 用法咨询 |
| `docs/gap` | 文档缺失或过时 |
| `good first issue` | 新贡献者友好 |

### 分支策略

- `main` — 稳定版本，每一次 commit 可发布
- `dev` — 开发分支
- `feat/<name>` — 功能分支，完成后合入 `dev`

---

## 发布流程

1. 更新 `caiao/pyproject.toml` 和 `caiao/__init__.py` 中的版本号
2. 更新 `docs/08-evolution-history/版本演进.md`
3. Git tag：`git tag v0.1.0`
4. Push tag 触发发布

---

## 贡献指南

详见 `docs/05-dev-guides/贡献者指南.md`。

核心约定：
- 框架代码用 Black 格式化，加类型注解
- 文档修改同步对应的 frontmatter 和 MANIFEST.yaml
- 新增 Server 必须带 caiao.yaml 清单
- 不支持的功能返回 `{"error": "unavailable"}`，不报异常
