# 知识空间已选内容快速问答验收报告

**候选 / 部署 SHA**：`3e213cbd8de586af246e0d2324ec3542fd99c905`

**环境**：`http://192.168.106.114:13100/`

**用例**：[acceptance-test-cases.md](./acceptance-test-cases.md)

**执行时间**：2026-07-27

## 首轮结果

候选源码、后端定向测试和两个前端生产构建均已在 `13100` 独立环境完成。服务重启后，backend 为 healthy，13100 根入口、`/api/v1/env` 与 OpenFGA 均返回 HTTP 200；共享的 `13000` 与 `3001` 保持 HTTP 200。

Codex 内置浏览器可正常打开 13100，但当前浏览器没有已授权的 BISHENG 登录态，停留在登录页。未自动创建账号、读取业务凭据或绕过验证码，因此登录后的列表勾选与输入框交互用例记为 `BLOCKED`。

| Case ID | 状态 | 实际结果 | 证据 |
|---|---|---|---|
| TC-001 | BLOCKED | 13100 登录页正常；无登录态，无法操作知识空间并抓取未选择状态的真实请求 | 内置浏览器登录页；前端构建 PASS |
| TC-002 | BLOCKED | 已部署单文件显式范围与引用卡片代码；无登录态，未执行真实列表勾选 | Jest 3/3 PASS；服务器源码哈希一致 |
| TC-003 | BLOCKED | 已部署混合多选、横向单行卡片和文件夹递归解析；无登录态，未执行真实页面滚动 | 后端 pytest 9/9 PASS；前端构建 PASS |
| TC-004 | BLOCKED | 已部署卡片移除与列表勾选同步；无登录态，未验证保留输入文本 | 代码检查与生产构建 PASS |
| TC-005 | BLOCKED | 已部署发送后保留、新建 / 切换会话清空；无登录态，未执行会话交互 | 代码检查与生产构建 PASS |
| TC-006 | PASS | 定向测试确认显式范围 `[11, 33]` 与标签命中 `[33, 44]` 只把 `[33]` 送入检索 | 后端 pytest 9/9 PASS |
| TC-007 | PASS | backend healthy；13100 根入口、env、OpenFGA、13000、3001 均为 HTTP 200 | 服务器健康检查 |

## 自动化与构建

| 检查 | 结果 | 说明 |
|---|---|---|
| 工作台 Jest | PASS | `useFolderChat.test.ts` 3/3；覆盖文件 / 文件夹参数拆分、显式空范围和未选择时字段省略 |
| 后端 pytest | PASS | `test_knowledge_space_chat_permissions.py` 9/9；覆盖文件直选、文件夹递归、显式空范围与标签交集 |
| Python 语法检查 | PASS | schema、endpoint、service 与测试文件 |
| import 大小写检查 | PASS | `npm run check-imports` |
| client 本地生产构建 | PASS | 仅项目既有的包体积、PWA 图标与字体告警 |
| client 服务器生产构建 | PASS | 新产物已由 13100 frontend 提供 |
| platform 服务器生产构建 | PASS | 仅项目既有的包体积与 Browserslist 告警 |
| 核心源码一致性 | PASS | 后端范围解析、前端请求与两个输入框组件的服务器 SHA-256 与候选一致 |

## 部署记录

- 变更前 SHA：`522a8fae2d9ddc5e66dda36c823f143d4224798f`
- 变更后 SHA：`3e213cbd8de586af246e0d2324ec3542fd99c905`
- 备份：`/opt/codex-bisheng/.codex-deploy-backups/quick-qa-20260727-predeploy.tar.gz`
- 重启服务：`backend`、`backend_worker`、`frontend`
- 首次并行重启时 `/api/v1/env` 短暂返回 502；backend healthy 后按运维基线单独重启 frontend，随即恢复 HTTP 200。

## 结论

候选代码、后端范围逻辑、生产构建、服务重启和环境边界检查均已完成，功能已更新到 `13100`。由于验收浏览器缺少登录态，TC-001–TC-005 仍需在已登录页面完成最终 UI 复核；当前不能将整套浏览器验收标记为全部通过。
