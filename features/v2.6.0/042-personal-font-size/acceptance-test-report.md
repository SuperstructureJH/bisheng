# 个人字体大小验收报告

**环境**: `http://192.168.106.114:13100/`  
**账号角色**: 独立验证环境管理员  
**用例**: [acceptance-test-cases.md](./acceptance-test-cases.md)  

> 2026-07-27 用户明确接受跳过 Codex 浏览器验收，要求直接部署并自行手工确认 UI 效果。因此浏览器用例保持 `NOT_RUN`；本报告只记录可由命令行完成的构建、接口、健康与部署边界检查，不将未执行用例标记为通过。

## 第一轮：变更前现状

| Case ID | 状态 | 实际结果 | 差异 / Bug | 证据 |
|---|---|---|---|---|
| TC-001 | NOT_RUN | — | — | — |
| TC-002 | NOT_RUN | — | — | — |
| TC-003 | NOT_RUN | — | — | — |
| TC-004 | NOT_RUN | — | — | — |
| TC-005 | NOT_RUN | — | — | — |
| TC-006 | NOT_RUN | — | — | — |
| TC-007 | NOT_RUN | — | — | — |
| TC-008 | PASS | 未登录 `PUT /api/v1/user/preferences/font-size` 返回 HTTP 401 | — | 服务器命令行状态记录 |
| TC-009 | NOT_RUN | — | — | — |
| TC-010 | PASS | `13000` 与 `3001` 均返回 HTTP 200，部署仅写入 `/opt/codex-bisheng` | — | 服务器命令行状态记录 |

## Bug 汇总

| Bug ID | 来源 | 状态 | 说明 | 证据 |
|---|---|---|---|---|
| F042-02 | 用户手工检查 TC-011 | 已修复，待人工确认 | 管理后台点击【字体大小】后，滑杆曾在个人主菜单内部向下展开；提交 `29cbdcc94` 已改为从主菜单左侧弹出独立气泡并部署到 13100 | `test-evidence/run-2/TC-011-admin-inline-expanded-full.png`、`TC-011-admin-inline-expanded-detail.png` |

## 第二轮：管理后台弹层方式反馈

用户提供的 13100 实际截图确认：入口与滑杆内容已经出现，但实现使用内联展开，未满足新的 AC-10。TC-011 当前记为 `FAIL`；修复后将重新执行构建、部署和边界检查，页面视觉结果仍由用户手工确认。

| Case ID | 状态 | 实际结果 | 差异 / Bug | 证据 |
|---|---|---|---|---|
| TC-011 | FAIL | 滑杆在个人主菜单内部展开，主菜单高度明显增加 | F042-02 | `test-evidence/run-2/TC-011-admin-inline-expanded-full.png`、`TC-011-admin-inline-expanded-detail.png` |

## 第三轮：修复与重新部署

修复提交 `29cbdcc9464a189f24ef729e099b8b9103283d46` 已重新部署到 `13100`。代码级用例和静态构建可以证明管理后台渲染了方向为 `left` 的独立定位气泡，不能替代登录后的最终视觉确认，因此 TC-011 在用户完成手工检查前记为 `NOT_RUN`，不提前标记通过。

| Case ID | 层级 | 状态 | 实际结果 | 证据 |
|---|---|---|---|---|
| TC-011 | 代码 | PASS | 新增回归用例确认字号控件容器为独立绝对定位，并标记 `data-side="left"` | `mainLayoutWorkspaceMenu.test.tsx`，4/4 通过 |
| TC-011 | 构建 | PASS | 本地与服务器管理端生产构建成功；服务器静态资源可检出 `admin-font-size-popover` | 构建日志、`TenantSelect-C662Hv4Z.js` |
| TC-011 | UI | NOT_RUN | 用户尚未在重新部署后的登录态页面确认气泡位置、箭头、间距和主菜单高度 | 待用户手工截图 |
| TC-010 | 部署边界 | PASS | `13100` 根入口和 `/api/v1/env`、共享 `13000` 与 `3001` 均返回 HTTP 200 | 服务器命令行状态记录 |

## 部署与命令行检查

- 本地与服务器上的 client、platform 生产构建均成功；仅出现项目既有的包体积、浏览器数据和 PWA 静态资源匹配警告。
- 三方合并保留了服务器现有管理端数据集菜单权限逻辑，以及工作台知识空间上传能力逻辑。
- 部署目标提交标记为 `55ab8aa7139f541752365052225e62ea5f68b3e4`；覆盖前备份位于 `/opt/codex-bisheng/.codex-deploy-backups/font-size-20260727-1026-predeploy.tar.gz`。
- 部署包携带的 macOS AppleDouble 元数据文件曾导致 Alembic UTF-8 扫描失败；已删除本次产生的全部 `._*` 元数据文件并重新启动，随后 Alembic、API 与 Worker 均正常启动。
- `13100` 根入口和 `/api/v1/env` 均返回 HTTP 200；`user_preference` 表含 `user_id`、`font_scale_level`、`create_time`、`update_time`。
- `codex-bisheng` 的 backend 为 healthy，backend_worker、frontend 及全部数据组件处于运行状态。
- 管理后台左侧气泡修复的发布备份位于 `/opt/codex-bisheng/.codex-deploy-backups/font-size-popover-20260727-1505-predeploy/platform-build`。
- 本轮首次重启未显式指定隔离编排文件，默认 Compose 尝试绑定共享端口 `3001` 并被端口冲突拒绝；未停止共享容器。随后使用 `docker-compose.codex.yml` 重建独立 frontend，`13100` 恢复正常，`13000` 与 `3001` 复测均为 HTTP 200。
- 容器运行环境未安装 pytest，因此未在服务器内重复执行单元测试；后端语法检查与历史单元测试结果沿用，实际接口鉴权和数据库结构已复核。

## 完整回归

本轮不执行自动浏览器回归；部署后由用户按同一组 Case ID 手工确认。

## 第四轮：后台大字号布局反馈与收窄修复

2026-07-27 用户提供 `13100` 的第 5 档和第 7 档截图，并明确本期不做管理后台所有页面的完整字号适配。本轮只处理截图中可稳定归因的通用布局回归：侧栏对齐与单行保护、模型配置区局部溢出、字号气泡描边和边缘间距；不逐页改造全部业务组件。

### 修改前首轮结果

| Case ID | 执行层级 | 状态 | 实际结果 | 差异 / Bug | 证据 |
|---|---|---|---|---|---|
| TC-012 | 用户截图 | FAIL | 第 7 档下侧栏文字逐字纵向换行；第 5 档下选中项文字间距和对齐异常 | F042-03：旧侧栏固定宽度、固定 `48px` 文字区及固定行高无法承载放大后的字号 | `test-evidence/run-4/TC-012-013-level-7-before.png`、`TC-012-013-level-5-before.png` |
| TC-013 | 用户截图 | FAIL | 第 5/7 档下模型配置行中的下拉框、输入框、单选项被压缩，标签和控件存在重叠或截断风险 | F042-04：固定列宽和固定内容宽度未提供局部横向溢出边界 | 同上 |
| TC-014 | 用户截图 | FAIL | 字号气泡已有独立左侧定位，但箭头、主体描边和内边距分别硬编码，缺少统一约束 | F042-05：气泡未复用单一边框、背景、圆角和间距 token | 同上 |

### 本轮范围边界

- **修复**：后台主侧栏、模型配置页截图中可复用的容器规则、字号气泡通用边界。
- **不修复**：后台所有页面的逐页视觉适配、所有表格/弹窗/画布的完整大字号回归、移动端后台。
- **判定原则**：通过局部容器扩展、单行省略和局部滚动兜底；不使用整页 `zoom`，不降低用户选择的字号。

### 修改后本地检查

| 检查项 | 状态 | 结果 |
|---|---|---|
| `mainLayoutWorkspaceMenu.test.tsx` + `workbenchModelValidation.test.ts` | PASS | 2 个文件、18 条用例通过；新增侧栏单行布局合同和统一字号气泡 class 回归 |
| 管理后台生产构建 | PASS | `vite build` 成功；仅保留项目既有的 Browserslist、第三方 `eval` 和大包体积警告 |
| 架构检查 | PASS | `scripts/arch-guard.sh` 退出码 0 |
| 管理后台完整 Vitest | BLOCKED | 修改分支为 24 个文件通过、6 个文件失败、133/147 条通过；基线 `bd9799803` 同样为 24 个文件通过、6 个文件失败、132/146 条通过，失败集中在未改动的权限、系统页测试环境和 `IntersectionObserver` 缺失，本轮未扩大修复范围 |
| 登录态 UI 回归 | BLOCKED | Codex 内置浏览器可访问 `13100`，但没有该环境登录态；首轮以用户提供的登录态截图作为失败证据，修复后的最终视觉结果待部署后确认 |

### 第四轮部署与环境回归

- 本轮布局修复提交为 `aea66437fe5a80bd5b55c48a5a1434c69b6cfa5d`。
- 部署前逐文件核对服务器版本，仅覆盖管理端的 5 个目标源码文件；部署前备份为 `/opt/codex-bisheng/.codex-deploy-backups/font-size-admin-layout-20260727-154503-predeploy.tar.gz`。
- 服务器管理端生产构建成功，发布静态资源可检出 `bisheng-admin-sidebar`、`bisheng-admin-nav-item`、`bisheng-model-config-grid`、`bisheng-font-size-popover` 和 `--bs-admin-sidebar-width`。
- 使用隔离编排文件 `docker-compose.codex.yml` 重启 backend、backend_worker 和 frontend；backend 为 `healthy`，backend_worker、frontend、openfga 均为 `running`。
- `13100` 根入口与 `/api/v1/env` 均返回 HTTP 200；共享 `13000` 与 `3001` 均返回 HTTP 200，未发现本轮部署影响共享环境。

| Case ID | 执行层级 | 状态 | 实际结果 | 证据 |
|---|---|---|---|---|
| TC-010 | 部署边界 | PASS | 隔离环境和共享环境四个探测入口均返回 HTTP 200；部署文件仅写入 `/opt/codex-bisheng` | 服务器 Compose 状态与 HTTP 状态记录 |
| TC-012 | 代码 / 构建 | PASS | 侧栏恢复统一图标列、文字起点和选中态边距；标准档维持原有 `184px / 48px` 基准，大字号档位才按 token 扩展；文字增加单行省略保护 | 单元测试、生产构建、发布静态资源 |
| TC-012 | 登录态 UI | BLOCKED | 内置浏览器没有 `13100` 登录态，尚未完成第 5/7 档的最终截图比对 | 待用户刷新后手工确认 |
| TC-013 | 代码 / 构建 | PASS | 模型分类标签和配置表格增加局部最小宽度及局部横向滚动，不通过压缩字段或整页缩放兜底 | 单元测试、生产构建、发布静态资源 |
| TC-013 | 登录态 UI | BLOCKED | 尚未在登录态下确认 1440px 与 1024px 页面是否仍有业务组件级溢出 | 待用户手工确认 |
| TC-014 | 代码 / 构建 | PASS | 字号气泡主体与箭头统一使用背景、描边、圆角、间距和暗色样式合同 | 单元测试、生产构建、发布静态资源 |
| TC-014 | 登录态 UI | BLOCKED | 尚未在登录态下完成箭头位置和边缘间距的视觉确认 | 待用户手工确认 |

### 第四轮结论

`13100` 已更新至本轮收窄修复并完成服务级回归。当前可以确认代码合同、构建产物、服务健康和部署边界通过；不能据此宣称管理后台所有页面已完成大字号适配，也不能将 TC-012–TC-014 的登录态视觉层提前标为通过。用户刷新后应优先复查第 5 档与第 7 档的左侧导航、模型配置区和字号气泡；若仍有问题，下一轮只调整对应 token 或局部容器，不扩大为全后台改造。

## 第五轮：中粮三档整页缩放与标品下线

2026-07-27 用户与前端确认替代此前七档语义 token 方案：BISHENG 标品本期不再提供字体大小入口；中粮专版固定为【小 / 标准 / 大】三档，底层以 90% / 100% / 110% 整页显示缩放实现。部署候选提交为 `3d64b307fdc16adfb1d99fa557474d668d782858`。

### 首轮执行结果

| Case ID | 执行层级 | 状态 | 实际结果 | 证据 |
|---|---|---|---|---|
| TC-001 / TC-002 | 配置 / 代码 | PASS | `13100` 双端静态配置均为 `fontSizeVariant: "cofco"`；两端入口只在该配置和电脑端渲染 | 在线配置文件、入口显隐单元测试 |
| TC-001 / TC-002 | 登录态 UI | BLOCKED | 内置浏览器能打开 `13100`，但停在账号、密码、验证码登录页，无法检查两个个人菜单 | 浏览器 DOM 快照，标题 `BISHENG`、版本 `v2.6.0` |
| TC-003 | 单元 / 构建 | PASS | 1 / 3 / 5 分别映射 0.9 / 1 / 1.1；双端生产构建均成功，发布 CSS 可检出 `--bisheng-display-zoom` | client 12/12、platform 字号与菜单 18/18、服务器构建产物 |
| TC-003 | 登录态 UI | BLOCKED | 无法在登录态页面读取三个档位下的实际元素尺寸 | 同上 |
| TC-004 / TC-005 | 服务契约 | PASS | 历史 1–2 / 3–4 / 5–7 归并逻辑已覆盖；新请求模型接受 1 / 3 / 5，拒绝 0 / 2 / 4 / 6 / 7 / 8 | 前端单元测试、服务器 Pydantic 契约检查 |
| TC-004 | 跨 SPA 运行时 | BLOCKED | 无登录态，无法完成管理后台保存后跳转工作台的可见确认 | 待用户手工执行 |
| TC-006 | 本地标品构建 | PASS | 仓库默认配置为 `disabled`，入口单元测试确认隐藏，应用函数会移除显示缩放属性并回到 100% | 本地配置、单元测试、生产构建 |
| TC-007 | 异常回滚 | NOT_RUN | 本轮未在登录态注入保存失败 | 保留原实现回滚逻辑，待接口故障演练 |
| TC-008 | 代码边界 | PASS | 小于 768px 时版本判断不启用；工作台移动端抽屉不渲染字号入口 | `isFontSizeEnabled` 与 `UserPopMenuDrawer` 代码检查 |
| TC-009 | 接口 / 契约 | PASS | 未登录更新返回 HTTP 401；服务器契约检查确认只允许 1 / 3 / 5 | `PUT /api/v1/user/preferences/font-size`、Pydantic 检查 |
| TC-010 | 代码 / 测试 | PASS | 管理后台继续使用左侧独立定位气泡，工作台使用右侧子菜单；主菜单不内联展开 | `mainLayoutWorkspaceMenu.test.tsx` |
| TC-010 | 登录态 UI | BLOCKED | 无法观察箭头、边距和主菜单实际高度 | 待用户手工执行 |
| TC-011 / TC-012 | 登录态 UI | BLOCKED | 无法进入工作台首页、知识空间、模型管理页和弹窗执行 1024px / 1440px 回归 | 待用户手工执行 |
| TC-013 | 部署边界 | PASS | `13100` 根入口与 `/api/v1/env` 为 HTTP 200；共享 `13000`、`3001` 为 HTTP 200；全部目标服务正常 | HTTP 探测与 Compose 状态 |

### 部署记录

- 部署前逐文件对比服务器与提交父版本；工作台知识页存在并行快速问答改动，使用三方合并保留 `knowledgeSelectedFilesState` 与 `selectedContents`，只删除已退出的旧字号侧栏监听。
- 管理后台源码在服务器上缺少此前确认的左侧气泡和侧栏稳定性修复，本轮按当前分支恢复，再叠加中粮版本显隐。
- 覆盖前备份：`/opt/codex-bisheng/.codex-deploy-backups/cofco-display-size-20260727-1727-predeploy.tar.gz`。
- 服务器工作台与管理后台生产构建均成功；后端语法检查及三档有效值/非法值契约检查通过。
- 使用 `/opt/codex-bisheng/docker/docker-compose.codex.yml` 和项目名 `codex-bisheng` 强制重建 `backend`、`backend_worker`，并重启 `frontend`。
- `backend`、MySQL、Redis、Milvus、MinIO、etcd 为 healthy；worker、frontend、OpenFGA、Elasticsearch 为 running；OpenFGA migrate 为 `Exited (0)`。

### 第五轮结论

代码、配置、构建、后端契约、服务健康、并行改动保留和部署隔离均已通过。登录后的三档可见效果、左右气泡和关键页面布局仍为 `BLOCKED`，原因是内置浏览器没有 `13100` 登录态；这些用例必须由用户登录后继续执行，不能提前记为 PASS。

## 第六轮：全视口缩放修复

2026-07-27 用户在 `13100` 登录态工作台完成第五轮的人工补充检查，确认根节点整页缩放存在阻断性视口问题：小档应用内容不足一屏，大档应用内容超出浏览器窗口。本轮先记录完整首轮失败，再修改代码。

### 修改前首轮结果

| Case ID | 执行层级 | 状态 | 实际结果 | 差异 / Bug | 证据 |
|---|---|---|---|---|---|
| TC-003 | 用户截图 | PASS | 小档和大档可见元素确实按整页比例缩小或放大 | — | `test-evidence/run-6/TC-014-small-viewport-gap-before.png`、`TC-014-large-viewport-overflow-before.png` |
| TC-014 | 用户截图 | FAIL | 小档下工作台白卡底部未覆盖浏览器可视区；大档下白卡超出浏览器底部 | F042-06：仅缩放 `html` 时，工作台全屏卡片仍按原始 `100dvh` 计算，未继承反向补偿后的应用视口 | 同上 |
| TC-015 | 代码检查 | FAIL | 根节点本身承担缩放，没有独立的物理视口与应用显示层边界；Portal、固定层和全屏页面缺少统一坐标合同 | F042-07：缩放边界与浏览器视口混为一层 | `src/frontend/*/src/style*`、两端主布局 |

### 本轮修复范围

- 保留中粮专版三档、90% / 100% / 110%、账号偏好和双入口，不改变已确认产品交互。
- 将真实浏览器视口与 BISHENG 应用显示层分离；应用显示层按缩放比例反向设置逻辑宽高。
- 工作台、管理后台的主布局及工作台全屏白卡改为继承应用显示层尺寸。
- 增加应用壳边界、Portal 和固定层回归；不恢复七档 token，也不逐页维护独立字号。

### 部署前代码与构建检查

| 检查项 | 状态 | 结果 |
|---|---|---|
| 工作台字号与视口合同 | PASS | 1 个测试文件、14 条用例通过；覆盖三档比例、反向视口、标品清理、显示层 CSS 与全屏根节点 |
| 管理后台字号与主布局合同 | PASS | 2 个测试文件、20 条用例通过；覆盖三档比例、反向视口、显示层 CSS、左侧气泡和主布局父级继承 |
| 工作台生产构建 | PASS | Vite 生产构建成功；仅保留项目既有字体、第三方 `eval`、包体积和 PWA 图标匹配警告 |
| 管理后台生产构建 | PASS | Vite 生产构建成功；仅保留项目既有非模块脚本、浏览器数据、第三方 `eval` 和包体积警告 |
| 架构检查 | PASS | `scripts/arch-guard.sh` 退出码 0 |

### 第六轮候选部署后的登录态结果

- 候选提交：`85dd99820`。
- 13100 双端生产构建成功，只重启隔离前端；13100 根入口与工作台为 HTTP 200，未登录用户接口为 401；共享 13000 与 3001 均为 HTTP 200。
- Codex 内置浏览器停在验证码登录页，因此按验收规范回退到用户本机 Chrome 的既有登录态执行 UI 检查。

| Case ID | 执行层级 | 状态 | 实际结果 | 差异 / Bug | 证据 |
|---|---|---|---|---|---|
| TC-014 | 登录态 UI | FAIL | 主页面外壳已覆盖可视区，但切换到【大】后，靠近屏幕底部的个人菜单与字号二级气泡仍超出浏览器窗口 | F042-08：`transform: scale()` 建立新的包含块和坐标系，Portal / fixed 元素定位后再次随应用层放大 | `test-evidence/run-7/TC-014-large-portal-overflow-before.png` |
| TC-015 | 登录态 UI | FAIL | 主页面与 Portal / fixed 层没有形成同一套最终物理视口坐标 | F042-08 | 同上 |

### F042-08 修复策略与部署前验证

- 应用显示层由 `transform: scale()` 改为参与浏览器布局计算的 `body zoom`。
- `body` 仍按 `100 / scale` 设置反向逻辑宽高，`html` 仅负责物理视口裁切，`#root` 和双端主布局继续继承父级 100% 尺寸。
- 本机 1280×720 探针在 110% 下得到：`inner=1280×720`、文档 `scroll=1280×720`、缩放后 `body=1280×720`；右下固定气泡 `right=1258`、`bottom=698`，完整位于物理视口内。
- 本节是第二次部署前验证，不等同于 13100 最终 PASS；必须重新构建、部署并在登录态工作台和管理后台执行完整回归。

## 第七轮：定位嵌套容器并完成最终回归

第六轮候选部署后继续在用户本机 Chrome 的既有登录态执行回归。该轮没有把“主壳不再越界”直接当作完成，而是依次检查工作台白卡、个人菜单、字号二级气泡、管理后台和业务弹窗，保留每次新暴露问题的失败状态。

### 迭代过程与失败保留

| Bug ID | 发现阶段 | 状态 | 说明 | 修复 |
|---|---|---|---|---|
| F042-08 | 大档工作台个人菜单 | 已修复 | `body zoom` 修复了主页面边界，但 Radix Portal 定位包装层仍按缩放前坐标参与定位，个人菜单和二级气泡可能越界 | `ee437519a` 为 Portal 包装层反向抵消缩放，`0380e3942` 让气泡内容重新应用当前比例并使用定位库碰撞边界 |
| F042-09 | 小档工作台白卡 | 已修复 | 将工作台轨道改为继承父级高度后，嵌套 KeepAlive 页面仍使用普通 `height: 100%`；该包含块没有明确高度，小档白卡仍未填满浏览器底部 | `53982e4af` 改为使用补偿后的 `--bisheng-display-viewport-height` 并扣除工作台壳层 16px 上下边距 |

中间提交 `5b1e89d04` 已使工作台轨道和头像入口保持在补偿视口内，但首轮 UI 复测发现 F042-09，因此没有将其作为最终版本。最终部署提交为 `53982e4af`。

### 最终自动检查

| 检查项 | 状态 | 结果 |
|---|---|---|
| 工作台字号与视口合同 | PASS | 15 / 15；覆盖三档映射、反向逻辑视口、标品清理、显示层 CSS、Portal 包装层与嵌套工作台高度 |
| 管理后台字号与菜单合同 | PASS | 20 / 20；覆盖三档映射、显示层 CSS、左侧独立气泡和菜单结构 |
| 工作台生产构建 | PASS | Vite 生产构建成功；仅保留项目既有警告 |
| 管理后台生产构建 | PASS | Vite 生产构建成功；仅保留项目既有警告 |
| 架构检查 | PASS | `scripts/arch-guard.sh` 退出码 0 |
| 服务器源码一致性 | PASS | 服务器 `MainLayout.tsx` SHA-256 为 `48353718c2b03a7d80529e2a9ccacda65de4a7482d7c578a1a0c9694d7e6ee49`，与本地最终文件一致 |
| 13100 健康探测 | PASS | `/` 与 `/workspace/knowledge/space/2` 均返回 HTTP 200 |

### 最终登录态 UI 回归

Codex 内置浏览器仍被验证码登录阻断，因此按验收规范回退到用户本机 Chrome 的既有登录态执行。当前窗口内容区约为 1296×675；本轮证明用户反馈的实际窗口问题已经修复，但不替代 1024px / 1440px 两个专项窗口回归。

| Case ID | 状态 | 实际结果 | 证据 |
|---|---|---|---|
| TC-001 / TC-002 | PASS | 工作台和管理后台个人菜单均展示【字体大小】入口 | `test-evidence/run-8/TC-014-large-font-popover-after.png`、`TC-014-admin-large-font-popover-after.jpeg` |
| TC-003 | PASS | 【小】按 90% 缩小且页面补满，【标准】恢复 100%，【大】按 110% 放大且不超出浏览器窗口 | `TC-014-small-full-viewport-after.jpeg`、`TC-014-large-full-viewport-after.jpeg` |
| TC-004 | PASS | 工作台选择【大】后进入管理后台，管理后台保持大档并显示选中状态；验收结束后恢复【标准】 | 双端登录态检查 |
| TC-010 | PASS | 工作台从个人菜单右侧弹出字号气泡；管理后台从个人菜单左侧弹出，主体和箭头完整位于窗口内 | `TC-014-large-font-popover-after.png`、`TC-014-admin-large-font-popover-after.jpeg` |
| TC-011 | PASS | 工作台知识页、对话输入区及管理后台模型页在当前窗口的小档和大档下均位于可视区 | `TC-014-small-full-viewport-after.jpeg`、`TC-014-large-full-viewport-after.jpeg`、`TC-014-admin-large-font-popover-after.jpeg` |
| TC-012 | NOT_RUN | 尚未分别调整为 1024px / 1440px 目标窗口执行专项回归 | 待 T016 |
| TC-013 | PASS | 最终前端已在隔离编排中重建；13100 两个探测入口返回 HTTP 200 | 服务器部署与健康记录 |
| TC-014 | PASS | 小档不再留下底部或右侧空白；大档不再产生页面级横向或纵向溢出 | `TC-014-small-full-viewport-after.jpeg`、`TC-014-large-full-viewport-after.jpeg` |
| TC-015 | PASS | 大档下工作台个人菜单、字号二级气泡、管理后台字号气泡和消息弹窗遮罩均完整位于物理视口内 | `TC-014-large-font-popover-after.png`、`TC-014-admin-large-font-popover-after.jpeg`、`TC-015-large-modal-overlay-after.jpeg` |

### 最终部署记录

- 最终提交：`53982e4af`。
- 服务器目标：`/opt/codex-bisheng`；隔离编排：`docker/docker-compose.codex.yml`，项目名 `codex-bisheng`。
- 最后两次覆盖前备份：`.codex-deploy-backups/cofco-display-scale-shell-20260727-190400-compensated-panel-predeploy`、`.codex-deploy-backups/cofco-display-scale-shell-20260727-190500-shell-height-predeploy`。
- 最终变更仅涉及工作台前端；服务器工作台生产构建通过后只重启隔离 frontend，未重建后端。
- 最终结论：用户本轮反馈的“小档不补满、大档超出屏幕”已在 13100 的当前登录态窗口复现、修复并回归通过；1024px / 1440px 专项窗口仍按 `NOT_RUN` 保留，不提前记为通过。
