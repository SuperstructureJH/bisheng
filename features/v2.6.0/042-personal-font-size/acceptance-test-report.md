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
