# F062 平台 UI 交付记录

> 历史记录：2026-09-09 用户后续取消 UNKNOWN 冻结及部门同步/筛选；当前语义以 [0.3.0 修订](./usage-and-search-revision.md) 和 design.md 为准。本页旧测试结果不代表修订后的验证结果。

> 当前有效修订：用户确认每用户可配多个模型，各模型独立月额度；一期不做限流，配置使用有字段说明的类型对象。DM8 实机本轮暂缓。最新代码、契约变更及实际验证结果见 [逐模型修订验收](./model-quota-revision.md)。下文保留此前检查时点的证据，测试数量不与新版相加。

日期：2026-09-09；B 分支 `feat-3.0.0-beta2-pre`。未提交、未推送。

## 实现范围 T100–108

- T100：规范、现有组件和语言源核对见 `platform-ui-check.md`。
- T101/T102：`bs.json` 三语言新增 DSH 文案；触及旧请求提示同步提取语言键。
- T103：`controllers/API/dsh.ts` + `types/dsh.ts` 对接 config、浏览器 authorize 及八管理接口，分页/许可/策略关键字段校验，所有新管理 GET 可取消。原封装默认行为保留；变更请求可保留 HTTP 冲突证据，依旧执行全局拦截与提示，无业务 403 分支。
- T104：`pages/DshLogin` 固定入口/PKCE 事务确认、真实身份说明、approve/deny、严格 loopback 校验、到期清理、内存票据复制兜底。深链仅 server；可选 VITE_DSH_DOWNLOAD_URL 仅无凭证 HTTPS。下载未配置时说明联系管理员与手动 BASE。授权 API 可选 decision 与既定 access_denied 回调由主线同步契约。
- T105：`SeatsView` 50 条游标页，300ms 搜索、部门/席位/登录筛选，旧请求取消，筛选重置游标。`SeatSessions` 独立 20 条页。操作稳定 UUID + 原 grant_version；超时同 ID 同 body 重试，未确认不显示成功。
- T106：`PolicyView/PolicyEditor/UsageSummary` 当前租户用户搜索、未占席用户预配置、上线 LLM 与共享标识、月总限额、按 model 用量、month/timezone/source/as_of。空集合或零限额允许作为明确禁止策略保存。1500/1000 按真实已用显示；未知与 unavailable 不伪造零、不提供强制清除。expected_version 与保存输入保留；已终结/冲突需要刷新核对后修改。
- T107：`DshManagement/OperationStatus` 许可摘要、两业务视图、所有当前访问操作审计。每个操作独立、最多 30 次自动查询，离开取消；可继续查同 ID。actor、目标、前后值、期望版本、committed/effective 时间均展示。未知响应与 HTTP 请求拒绝不伪装为持久层成功。
- T108：两组 router 均提供 `/desktop-login`，System DSH tab 仅 root/child 管理员。`userContext` 与安全 loginReturnTo 检查支持普通用户经过 SSO 回到授权页，不被管理台门禁提前送去工作台。

## 已完成验证

`pnpm --dir src/frontend/platform test`，选择 F062 测试和已有 `routeFilterPurity/f048DashboardPermissions`：**10 个文件、37 项通过**，其中 F062 新增 26 项，原回归 11 项。

- raw config disabled/畸形、loopback 白名单、剩余 TTL、重复确认抑制、拒绝不发票据、卸载取消。
- 1 万条内存测试数据仅加载 50 行，独立 session 请求、旧筛选响应不能覆盖新列表、同 op ID/版本重试。
- PROCESSING 审计、有界 30 次失败轮询、输入保留与重复变更抑制、实际超额 1500/1000、历史快照和 UNKNOWN 无清除入口。
- wrapper 默认 reject(null)/共享 toast 保持、opt-in 原错误和取消行为；SSO returnTo 同源/时效/一次性；独立授权路由与系统门禁。

最终 lint/typecheck/check-i18n 结果以本记录末尾更新为准。工具日志位于 `/private/tmp/f062-ui-{tests,lint,types,i18n}.log`。

真实本机 Vite + Chrome 访问 `http://127.0.0.1:3062/desktop-login`，页面独立加载，后端未接入时异常态布局正确，截图没有真实票据。单元/组件中的身份与票据仅 fixture；这不是完整浏览器/客户端 E2E。

## 外部联调与限制

- 未连接真实已启用 DSH 的完整平台 Web 会话/SSO/Nginx/桌面客户端，成功 loopback、OS 深链、剪贴板与浏览器混合内容策略需外部联调。用户已允许外部 E2E 环境缺口暂跳过。
- 普通部署需 Nginx/页面策略提供 no-store/no-referrer；授权页自身设置 no-referrer，票据只保留内存且到期清除。已有 SPA 资源加载不等价于服务端响应头验证。
- 原 bs-ui Input 在 jsdom 中有既有 `style jsx` 非布尔属性警告；测试通过，本次未修改设计组件样式。
- 原 prettier.config.js 在本机 Node 下 require ESM Tailwind 插件失败；仅对新增文件使用临时等价基础格式配置格式化，未改项目格式配置。

## 最终检查结果

2026-09-09 本次 UI 最终代码：`pnpm lint`（platform/client/ui/file-viewers）、`pnpm typecheck`（platform/client/file-viewers）、`pnpm check-i18n` 均 exit 0；`git diff --check` 通过。F062 26 项 + 原路由/权限回归 11 项，共 37 项通过。`pnpm --dir src/frontend/platform lint:prune` 自动缩减 3 项既有中文 suppression，未手工改基线。

本机预览服务仍位于 `127.0.0.1:3062`（仅本机、Vite），供主线继续查看；不代表部署。主线可在所有工作完成时停止该服务。

## 2026-09-14 授权成功页返回首页

- 浏览器授权成功后保留一次性授权码复制兜底和【返回首页】按钮，10 秒后静默返回毕昇首页。
- 页面不展示返回倒计时或授权码剩余秒数；拒绝、失败、过期状态不自动跳转。
- `DshLogin` 与授权 Hook 针对性测试 19 项通过，覆盖 10 秒定时跳转、立即返回按钮和拒绝授权不跳转；改动文件 ESLint、三语言一致性检查及平台生产构建通过。
- 全量平台类型检查仍有目标分支原有的 `f048DashboardPermissions.test.tsx`、`routeFilterPurity.test.ts` 两项错误；实际浏览器、桌面客户端及部署环境仍按独立联调验收记录。

## 2026-09-14 单租户企业名称维护

- 单租户模式向全局超级管理员开放【企业信息】入口，复用现有根租户更新接口维护企业名称；租户编码保持只读。
- 单租户页面仅展示根租户并隐藏搜索、分页；多租户模式继续使用【租户管理】列表和原管理能力。
- 企业名称保存前去除首尾空格。DSH 身份换证和刷新继续从租户数据源读取最新名称。
- 本次相关组件测试 28 项、改动文件 ESLint、三语言一致性检查和平台生产构建通过；覆盖更新失败时保留编辑窗口且不显示成功状态。全量类型检查仍为同一组目标分支原有的两项测试类型错误。

## 2026-09-14 时间范围使用统计与管理用词

- 新增 `GET /api/v1/dsh/admin/users/{user_id}/usage-summary`。接口按北京时间接收起止时间，48 小时内按小时聚合，更长范围按天聚合，最长支持 366 天。
- 一个 `request_id` 计一条消息，`SUCCEEDED` 计一次完成问答；失败、取消和执行中请求分别统计。Token 汇总保留输入、输出和总量，用量缺失请求单独计数并保持未知语义。
- “使用统计”视图提供今天、最近 7 天、最近 30 天和自定义时间范围，展示 Token、消息、完成问答、失败消息、活跃小时及趋势。
- 管理入口和模型授权文案统一为“桌面工作台 / 工作台模型授权 / 使用统计”；企业模型分组继续读取登录会话的租户名称，企业名称修改后在后续登录或刷新中生效。
- 部门与角色授权涉及授权主体和额度合并策略重构，本次统计交付继续使用现有用户级策略数据结构。
- 后端聚合与 SQL 可移植性专项 13 项通过、2 项因本机无真实 DM 驱动跳过；前端 10 个 DSH 测试文件共 45 项通过，平台生产构建通过。扩大后的旧后端管理套件有 32 项通过，外部数据库参数组需要显式隔离数据库，另有旧测试夹具模块替换冲突；DM8 真库、真实浏览器到 Desktop 登录、模型调用和部署环境验收分别记录。
