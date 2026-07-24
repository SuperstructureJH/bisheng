# 前端原型模式

前端原型模式用于 PRD 交互评审和截图。它复用 BISHENG 的真实 React 页面、组件、字体、间距和路由，但由 Vite 开发服务在本地拦截 `/api` 请求并返回固定 mock 数据，不需要启动 FastAPI、数据库、Redis、向量库或对象存储。

## 两个前端

| 服务 | 目录 | 地址 | 适用页面 |
|---|---|---|---|
| 管理端 | `src/frontend/platform` | `http://127.0.0.1:3001` | 应用搭建、后台知识库、模型和系统设置 |
| 工作台 | `src/frontend/client` | `http://127.0.0.1:4001/workspace/` | 首页、知识空间、订阅、最终用户问答 |

两个 SPA 不应混写。知识空间、知识空间内快速问答和个人阅读偏好优先在工作台验证；后台配置项在管理端验证。

## 首次安装

```bash
cd src/frontend/platform
npm ci

cd ../client
npm ci
```

## 启动

管理端：

```bash
cd src/frontend/platform
npm run prototype
```

工作台：

```bash
cd src/frontend/client
npm run prototype
```

工作台知识空间可直接打开：

```text
http://127.0.0.1:4001/workspace/knowledge
```

## Mock 数据

共享 mock 入口位于：

```text
src/frontend/prototype/mockApiPlugin.ts
```

它目前提供：

- 原型管理员登录态；
- 管理端环境配置与工作台配置；
- 部门知识空间、我创建的知识空间、我加入的知识空间；
- 知识空间详情、目录、文件和标签；
- 配额、通知和许可证等页面骨架依赖；
- 未显式定义接口的成功兜底，并在终端输出实际请求路径。

需要为新 PRD 增加原型数据时，优先只补目标页面用到的接口和状态，不在 mock 中复制完整后端业务。

## 使用边界

- 原型模式可以证明页面结构、视觉样式、控件状态和前端交互。
- Mock 返回不能证明真实后端接口、权限过滤、持久化、检索或并发行为已经实现。
- PRD 截图应标注“前端原型 / Mock 数据”，避免被误认为运行环境验证。
- 进入正式开发前，仍需单独确认接口契约、权限和异常状态。
