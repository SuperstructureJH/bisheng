import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

type PrototypeApp = "platform" | "client";

interface MockPluginOptions {
  app: PrototypeApp;
}

interface MockRequest {
  method: string;
  pathname: string;
  searchParams: URLSearchParams;
  body: unknown;
}

interface MockResponse {
  status?: number;
  data: unknown;
}

const now = "2026-07-24T10:00:00+08:00";
let mockFontScaleLevel = 3;

const mockUser = {
  user_id: 10001,
  user_name: "产品原型账号",
  external_id: "prototype",
  email: "prototype@bisheng.local",
  phone_number: null,
  remark: "Local frontend prototype",
  delete: 0,
  create_time: now,
  update_time: now,
  role: "admin",
  avatar: "",
  web_menu: [
    "admin",
    "backend",
    "board",
    "build",
    "create_app",
    "knowledge",
    "model",
    "evaluation",
    "mark_task",
    "log",
    "sys",
    "workstation",
    "frontend",
    "home",
    "apps",
    "subscription",
    "knowledge_space",
    "linsight_task_mode",
  ],
  menu_approval_mode: false,
  menu_approval_mode_workbench: false,
  menu_approval_mode_admin: false,
  can_manage_user_groups: true,
  is_department_admin: false,
  is_global_super: true,
  is_child_admin: false,
  has_workbench: true,
  has_admin_console: true,
  default_entry: "workspace",
};

const mockEnvironment = {
  env: "dev",
  version: "2.6.0-prototype",
  uns_support: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".md", ".html"],
  office_url: "",
  dialog_tips: true,
  dialog_quick_search: true,
  websocket_url: "",
  pro: false,
  dashboard_pro: false,
  application_usage_tips: true,
  show_github_and_help: false,
  enable_registration: false,
  uploaded_files_maximum_size: 50,
  uploaded_media_maximum_size: 1024,
  enable_etl4lm: false,
  multi_tenant_enabled: false,
  system_notification: "",
};

const mockWorkbenchConfig = {
  menuShow: true,
  sidebarIcon: { enabled: false, image: "" },
  assistantIcon: { enabled: false, image: "" },
  applicationCenterWelcomeMessage: "欢迎使用 BISHENG",
  applicationCenterDescription: "本地前端原型模式",
  welcomeMessage: "你好，我是 BISHENG",
  functionDescription: "当前页面使用本地 mock 数据。",
  inputPlaceholder: "输入问题，或从知识空间中选择内容",
  models: [],
  voiceInput: { enabled: false, model: "" },
  webSearch: { enabled: false, tool: "", bingKey: "", bingUrl: "", prompt: "" },
  knowledgeBase: { enabled: true, prompt: "" },
  fileUpload: { enabled: true, prompt: "" },
  skillEntry: { enabled: false },
  host: "/admin",
  linsight_invitation_code: false,
  linsight_cache_dir: "",
  waiting_list_url: "",
  shougang: { enabled: false, prefix: "" },
  knowledge_space: {
    tree_structured_directory_display: true,
    assistant_name: "AI 助手",
  },
  subscription: { assistant_name: "AI 助手" },
};

const departmentSpaces = [
  {
    id: 301,
    name: "产品研发部知识空间",
    description: "部门制度、项目资料与产品规范",
    auth_type: "private",
    user_name: "系统管理员",
    user_id: 10001,
    member_count: 26,
    file_count: 18,
    total_file_count: 18,
    user_role: "admin",
    is_pinned: true,
    create_time: now,
    update_time: now,
    tags: ["部门", "产品"],
    is_released: true,
    space_kind: "department",
    department_id: 12,
    department_name: "产品研发部",
  },
];

const mineSpaces = [
  {
    id: 101,
    name: "中粮项目知识空间",
    description: "需求、评审记录与交付资料",
    auth_type: "private",
    user_name: "产品原型账号",
    user_id: 10001,
    member_count: 8,
    file_count: 12,
    total_file_count: 12,
    user_role: "creator",
    is_pinned: true,
    create_time: now,
    update_time: now,
    tags: ["项目", "需求"],
    is_released: true,
    space_kind: "normal",
  },
  {
    id: 102,
    name: "产品设计规范",
    description: "交互规则、设计 token 与组件使用说明",
    auth_type: "private",
    user_name: "产品原型账号",
    user_id: 10001,
    member_count: 4,
    file_count: 9,
    total_file_count: 9,
    user_role: "creator",
    is_pinned: false,
    create_time: now,
    update_time: now,
    tags: ["设计", "规范"],
    is_released: true,
    space_kind: "normal",
  },
];

const joinedSpaces = [
  {
    id: 201,
    name: "市场与客户洞察",
    description: "客户反馈、竞品跟踪与行业材料",
    auth_type: "approval",
    user_name: "市场团队",
    user_id: 20001,
    member_count: 15,
    file_count: 21,
    total_file_count: 21,
    user_role: "member",
    is_pinned: false,
    create_time: now,
    update_time: now,
    tags: ["市场", "客户"],
    is_released: true,
    space_kind: "normal",
  },
];

const allSpaces = [...departmentSpaces, ...mineSpaces, ...joinedSpaces];

const rootChildren = [
  {
    id: 1001,
    file_name: "需求与评审",
    file_type: 0,
    knowledge_id: 101,
    file_size: null,
    success_file_num: 3,
    processing_file_num: 0,
    create_time: now,
    update_time: now,
  },
  {
    id: 1002,
    file_name: "BISHENG 2.4 产品需求文档.pdf",
    file_type: 1,
    knowledge_id: 101,
    file_size: 2457600,
    status: 2,
    tags: [{ id: 1, name: "PRD" }],
    user_name: "产品原型账号",
    create_time: now,
    update_time: now,
  },
  {
    id: 1003,
    file_name: "知识空间分类交互说明.docx",
    file_type: 1,
    knowledge_id: 101,
    file_size: 864000,
    status: 2,
    tags: [{ id: 2, name: "交互" }],
    user_name: "产品原型账号",
    create_time: now,
    update_time: now,
  },
  {
    id: 1004,
    file_name: "字体大小视觉规范.md",
    file_type: 1,
    knowledge_id: 101,
    file_size: 12000,
    status: 2,
    tags: [{ id: 3, name: "视觉" }],
    user_name: "产品原型账号",
    create_time: now,
    update_time: now,
  },
];

function envelope(data: unknown) {
  return {
    status_code: 200,
    status_message: "success",
    data,
  };
}

function emptyListData(pathname: string): unknown {
  if (pathname === "/api/v1/notifications") {
    return { data: [], total: 0, unreadCount: 0, requestUnreadCount: 0 };
  }
  if (pathname.includes("/quota/")) return [];
  if (
    /(?:\/list|\/history|\/messages|\/tags|\/recommended|\/used|\/conversations|\/permissions|\/members)(?:\/|$)/.test(
      pathname,
    )
  ) {
    return [];
  }
  return {};
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function normalizeUrl(rawUrl: string): URL {
  const url = new URL(rawUrl, "http://prototype.local");
  if (url.pathname.startsWith("/workspace/api/")) {
    url.pathname = url.pathname.replace(/^\/workspace/, "");
  }
  return url;
}

function resolveMock(request: MockRequest): MockResponse {
  const { method, pathname, searchParams, body } = request;

  if (method === "GET" && pathname === "/api/v1/user/info") {
    return { data: envelope({ ...mockUser, font_scale_level: mockFontScaleLevel }) };
  }
  if (method === "GET" && pathname === "/api/v1/user/current") {
    return { data: envelope({ ...mockUser, font_scale_level: mockFontScaleLevel }) };
  }
  if (method === "PUT" && pathname === "/api/v1/user/preferences/font-size") {
    const level = Number((body as { level?: unknown } | undefined)?.level);
    if (!Number.isInteger(level) || level < 1 || level > 7) {
      return {
        status: 422,
        data: { detail: "font scale level must be between 1 and 7" },
      };
    }
    mockFontScaleLevel = level;
    return { data: envelope({ font_scale_level: mockFontScaleLevel }) };
  }
  if (method === "GET" && pathname === "/api/v1/env") {
    return { data: envelope(mockEnvironment) };
  }
  if (method === "GET" && pathname === "/api/v1/workstation/config") {
    return { data: envelope(mockWorkbenchConfig) };
  }
  if (method === "GET" && pathname === "/api/license/status") {
    return {
      data: envelope({
        version: "prototype",
        expire_day: null,
        days_remaining: null,
        severity: "normal",
        expired: false,
        checked_at: now,
      }),
    };
  }
  if (method === "GET" && pathname === "/api/roles/admin") {
    return {
      data: {
        _id: "prototype-admin",
        name: "ADMIN",
        BOOKMARKS: { USE: true },
        PROMPTS: { SHARED_GLOBAL: true, USE: true, CREATE: true },
        AGENTS: { SHARED_GLOBAL: true, USE: true, CREATE: true },
        MULTI_CONVO: { USE: true },
        TEMPORARY_CHAT: { USE: true },
        RUN_CODE: { USE: true },
      },
    };
  }
  if (method === "GET" && pathname === "/api/v1/quota/effective") {
    return {
      data: envelope([
        { resource_type: "knowledge_space", role_quota: -1, tenant_quota: -1, tenant_used: 4, user_used: 2, effective: -1 },
        { resource_type: "knowledge_space_file", role_quota: -1, tenant_quota: -1, tenant_used: 60, user_used: 21, effective: -1 },
      ]),
    };
  }
  if (method === "GET" && pathname === "/api/v1/notifications") {
    return { data: { data: [], total: 0, unreadCount: 0, requestUnreadCount: 0 } };
  }
  if (method === "POST" && pathname === "/api/v1/permissions/check") {
    return { data: envelope({ allowed: true }) };
  }
  if (method === "GET" && pathname === "/api/v1/tool") {
    return { data: envelope([]) };
  }
  if (method === "GET" && pathname === "/api/v1/linsight/skill") {
    return { data: envelope({ data: [], total: 0 }) };
  }
  if (method === "GET" && pathname === "/api/v1/chat/online") {
    return { data: envelope([]) };
  }
  if (method === "GET" && pathname === "/api/v1/llm/workbench") {
    return { data: envelope([]) };
  }
  if (method === "GET" && pathname === "/api/v1/knowledge/space/department") {
    return { data: envelope(departmentSpaces) };
  }
  if (method === "GET" && pathname === "/api/v1/knowledge/space/mine") {
    return { data: envelope(mineSpaces) };
  }
  if (method === "GET" && pathname === "/api/v1/knowledge/space/joined") {
    return { data: envelope(joinedSpaces) };
  }
  if (method === "GET" && pathname === "/api/v1/knowledge/space/managed") {
    return { data: envelope(allSpaces) };
  }
  if (method === "GET" && pathname === "/api/v1/knowledge/space/auto-tag-visibility") {
    return { data: envelope({ visible: true }) };
  }
  if (method === "GET" && /^\/api\/v1\/knowledge\/space\/\d+\/info$/.test(pathname)) {
    const id = Number(pathname.split("/").at(-2));
    return { data: envelope(allSpaces.find((space) => space.id === id) ?? mineSpaces[0]) };
  }
  if (method === "GET" && /^\/api\/v1\/knowledge\/space\/\d+\/tag$/.test(pathname)) {
    return {
      data: envelope([
        { id: 1, name: "PRD" },
        { id: 2, name: "交互" },
        { id: 3, name: "视觉" },
      ]),
    };
  }
  if (method === "GET" && /^\/api\/v1\/knowledge\/space\/\d+\/children$/.test(pathname)) {
    const folderOnly = searchParams.get("file_type") === "0";
    const data = folderOnly ? rootChildren.filter((item) => item.file_type === 0) : rootChildren;
    return {
      data: envelope({
        data,
        page_size: Number(searchParams.get("page_size") ?? 20),
        has_more: false,
        next_cursor: null,
        total: data.length,
      }),
    };
  }
  if (method === "GET" && /^\/api\/v1\/knowledge\/space\/\d+\/search$/.test(pathname)) {
    const keyword = (searchParams.get("keyword") ?? "").trim().toLowerCase();
    const data = keyword
      ? rootChildren.filter((item) => item.file_name.toLowerCase().includes(keyword))
      : rootChildren;
    return { data: envelope({ data, has_more: false }) };
  }

  return { data: envelope(emptyListData(pathname)) };
}

function sendJson(res: ServerResponse, response: MockResponse): void {
  res.statusCode = response.status ?? 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Bisheng-Prototype-Mock", "1");
  res.end(JSON.stringify(response.data));
}

export function createFrontendPrototypeMockPlugin(options: MockPluginOptions): Plugin {
  return {
    name: `bisheng:frontend-prototype-mock:${options.app}`,
    apply: "serve",
    configureServer(server) {
      server.middlewares.stack.unshift({
        route: "",
        handle: async (req, res, next) => {
          const rawUrl = req.url ?? "";
          const url = normalizeUrl(rawUrl);
          if (!url.pathname.startsWith("/api/")) {
            next();
            return;
          }

          const request: MockRequest = {
            method: (req.method ?? "GET").toUpperCase(),
            pathname: url.pathname,
            searchParams: url.searchParams,
            body: await readBody(req),
          };
          const response = resolveMock(request);
          console.log(`[prototype:${options.app}] ${request.method} ${request.pathname}`);
          sendJson(res, response);
        },
      });
      console.log(`[prototype:${options.app}] local mock API enabled`);
    },
  };
}
