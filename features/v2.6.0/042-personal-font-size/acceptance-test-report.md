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

浏览器用例未执行；待用户手工反馈后补充实际差异。

## 部署与命令行检查

- 本地与服务器上的 client、platform 生产构建均成功；仅出现项目既有的包体积、浏览器数据和 PWA 静态资源匹配警告。
- 三方合并保留了服务器现有管理端数据集菜单权限逻辑，以及工作台知识空间上传能力逻辑。
- 部署目标提交标记为 `55ab8aa7139f541752365052225e62ea5f68b3e4`；覆盖前备份位于 `/opt/codex-bisheng/.codex-deploy-backups/font-size-20260727-1026-predeploy.tar.gz`。
- 部署包携带的 macOS AppleDouble 元数据文件曾导致 Alembic UTF-8 扫描失败；已删除本次产生的全部 `._*` 元数据文件并重新启动，随后 Alembic、API 与 Worker 均正常启动。
- `13100` 根入口和 `/api/v1/env` 均返回 HTTP 200；`user_preference` 表含 `user_id`、`font_scale_level`、`create_time`、`update_time`。
- `codex-bisheng` 的 backend 为 healthy，backend_worker、frontend 及全部数据组件处于运行状态。
- 容器运行环境未安装 pytest，因此未在服务器内重复执行单元测试；后端语法检查与历史单元测试结果沿用，实际接口鉴权和数据库结构已复核。

## 完整回归

本轮不执行自动浏览器回归；部署后由用户按同一组 Case ID 手工确认。
