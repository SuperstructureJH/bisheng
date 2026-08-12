# Design: 中粮专版预置 Skill 前端隐藏

**关联**: [spec.md](./spec.md) · [tasks.md](./tasks.md)
**版本**: v2.6.0 中粮专版
**最后更新**: 2026-08-12

## 1. 目标与非目标

- **目标**：在 F035 的租户 Skill 生命周期上增加租户级前端隐藏策略；业务前台只看到可见 Skill，任务运行时服务端强制加入已启用的隐藏 Skill。
- **非目标**：不让前端伪造“自动勾选”承担运行保证；不把中粮配置写成全局默认；不改变现有 Skill 停用语义。

## 2. 关键约束

- 遵循 `docs/constitution.md` C1–C7 和 `features/v2.6.0/release-contract.md` 中 F035 的领域归属。
- 119:3004 当前基线 `7fd8eacb39eb6b7f7ad175e55dabb402313c03e0`，`linsight_skill` 与 Skill 根目录均无 Office 数据。
- 配置必须按当前租户生效；全局超级管理员在 admin-scope 下操作目标租户。
- 业务前台响应不得包含隐藏 Skill 的名称、描述或隐藏字段。

## 3. 方案对比与选定

### 决策 1：隐藏状态单独建策略表

- **备选**：A. 给 `linsight_skill` 加列；B. 新建 `linsight_skill_policy`，按 `(tenant_id, skill_name)` 唯一记录策略。
- **选定**：B。
- **原因**：隐藏是部署/租户策略，不是 Skill 内容属性；独立表能避免修改现有表的迁移链，并天然不反向影响其他租户。缺行即 `false`。
- **何时重新考虑**：所有发行版都把隐藏提升为 Skill 固有状态，且迁移链已统一时。

### 决策 2：运行时合并发生在服务端物化边界

- **备选**：A. 前端自动勾选并提交；B. 提交时写入 session；C. `materialize_session_skills` 每次运行/恢复时合并。
- **选定**：C。
- **原因**：覆盖旧客户端、直接 API、恢复与继续；隐藏名称不写回前端可见 session 字段，且停用状态在每次运行时重新校验。
- **何时重新考虑**：模型请求协议出现独立的服务端能力策略对象时。

### 决策 3：管理 API 按操作者能力裁剪

- **备选**：A. 为超级管理员另建整套列表 API；B. 复用列表并返回 `can_configure_frontend_hidden`，非超级管理员过滤隐藏项且不返回策略字段。
- **选定**：B。
- **原因**：保持现有管理页和 CRUD 契约；租户管理员无法发现隐藏项，全局超级管理员仍可在同一页面管理。

## 4. 系统现状

### 4.1 数据流

`超级管理员后台开关 → SkillService 写租户策略 + audit_log → /selectable 过滤隐藏 → 任务执行 materialize_session_skills 合并用户选择与启用隐藏项 → Skill bundle 复制到 /skills → 模型请求`

### 4.2 关键数据结构 / 字段约定

| 字段 / 结构 | 类型 | 说明 |
|---|---|---|
| `linsight_skill_policy.tenant_id` | int | 目标租户 |
| `linsight_skill_policy.skill_name` | varchar(64) | Skill ID |
| `linsight_skill_policy.frontend_hidden` | bool/int | 前端隐藏开关，缺行等同 false |
| `PATCH /skill/{name}/frontend-hidden` | `{frontend_hidden: bool}` | 仅全局超级管理员 |
| `GET /skill` | `data,total,can_configure_frontend_hidden` | 非超级管理员不返回隐藏项或字段 |

### 4.3 关键模块职责

| 模块 | 职责 |
|---|---|
| `linsight_skill.py` | Skill 与租户策略持久化、严格租户隔离 |
| `skill_service.py` | 管理投影、隐藏访问门禁、策略审计编排 |
| `skill.py` endpoint | 鉴权、全局超级管理员能力判定、响应裁剪 |
| `skill_provisioning.py` | 运行时合并、停用过滤、去重和 bundle 物化 |
| `SkillManagement.tsx` | 超级管理员后台开关；不承担运行保证 |
| `provision_cofco_office_skills.py` | 仅对指定租户初始化 docx/pptx/xlsx 与隐藏策略，默认 dry-run |

## 5. 已知坑 / 反直觉事实

| # | 事实 | 风险 | 处理 |
|---|---|---|---|
| 1 | 当前 `None`/`[]` 明确定义为“不选择任何 Skill” | 直接恢复旧的“空值加载全部”会破坏 F035 安全门 | 只自动加入策略表中已启用且隐藏的精确集合 |
| 2 | `linsight_skill` 当前为空，Skill 根目录也为空 | 只做 UI 开关无法产生可验收页面或运行能力 | 用独立、可审计、默认 dry-run 的中粮初始化脚本落三项数据 |
| 3 | 租户管理员与全局超级管理员共用现有依赖 | 仅在前端藏列会被 API 绕过 | Endpoint + Service 双层按全局超级管理员裁剪/门禁 |
| 4 | 隐藏身份不能写回业务前台可见状态 | session 响应或历史可能泄露名称 | 只在 worker 物化边界合并，不改用户提交字段 |

## 6. 对外契约与依赖

- 复用 `/api/v1/linsight/skill`；新增隐藏开关 PATCH，不新增错误码。
- 依赖 F035 的 `LinsightSkill`、`SkillStore`、`materialize_session_skills` 与现有 `audit_log`。
- Office Skill 内容依赖任务模式已有的文件工作区；需要执行代码时使用现有 `bisheng_code_interpreter`，不新增 Shell/CLI 依赖。

## 7. 测试与可观测

- DAO/Service/API：租户隔离、非超级管理员裁剪、开关与审计。
- Provisioning：空提交自动补齐隐藏、停用优先、去重、其他租户隔离。
- Platform：类型检查/构建与 119:3004 真实后台页面截图。
- 日志记录 `tenant_id`、用户提交集合、隐藏强制集合与最终物化集合；不回传业务前台。

## 8. 后续改进

- 本轮不承诺三类 Office Skill 的完整模型产物质量评测；本轮验收核心是隐藏配置与服务端强制注入链路。
