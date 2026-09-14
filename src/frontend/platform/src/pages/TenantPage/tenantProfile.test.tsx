import { locationContext } from "@/contexts/locationContext";
import { userContext } from "@/contexts/userContext";
import { fireEvent, render, screen } from "@/test/test-utils";
import type { Tenant } from "@/types/api/tenant";
import type { ContextType } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TenantPage from "./index";

const useTableMock = vi.hoisted(() => vi.fn());
const getTenantApiMock = vi.hoisted(() => vi.fn());

vi.mock("@/util/hook", () => ({ useTable: useTableMock }));
vi.mock("@/controllers/API/tenant", () => ({
  deleteTenantApi: vi.fn(),
  getTenantApi: getTenantApiMock,
  getTenantsApi: vi.fn(),
  updateTenantStatusApi: vi.fn(),
}));
vi.mock("@/controllers/request", () => ({
  captureAndAlertRequestErrorHoc: <T,>(promise: Promise<T>) => promise,
}));
vi.mock("@/utils/tenantDisplayName", () => ({
  displayTenantName: (name: string) => name,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("./components/CreateTenantDialog", () => ({
  CreateTenantDialog: ({ profileMode }: { profileMode?: boolean }) => (
    <div data-testid="tenant-editor">
      {profileMode ? "profile-mode" : "management-mode"}
    </div>
  ),
}));
vi.mock("./components/TenantQuotaDialog", () => ({
  TenantQuotaDialog: () => null,
}));
vi.mock("./components/TenantUserDialog", () => ({
  TenantUserDialog: () => null,
}));

const rootTenant: Tenant = {
  id: 1,
  tenant_name: "Default Tenant",
  tenant_code: "default",
  logo: null,
  status: "active",
  user_count: 1,
  storage_used_gb: 0,
  storage_quota_gb: null,
  create_time: "2026-09-14T00:00:00",
};

const childTenant: Tenant = {
  ...rootTenant,
  id: 2,
  tenant_name: "Child Tenant",
  tenant_code: "child",
};

function renderTenantPage(multiTenantEnabled: boolean) {
  const userValue: ContextType<typeof userContext> = {
    user: { role: "admin" },
    setUser: vi.fn(),
    savedComponents: [],
    addSavedComponent: async () => null,
    checkComponentsName: () => false,
    delComponent: vi.fn(),
  };
  const locationValue: ContextType<typeof locationContext> = {
    current: [],
    setCurrent: vi.fn(),
    isStackedOpen: false,
    setIsStackedOpen: vi.fn(),
    showSideBar: true,
    setShowSideBar: vi.fn(),
    extraNavigation: { title: "" },
    setExtraNavigation: vi.fn(),
    extraComponent: null,
    setExtraComponent: vi.fn(),
    appConfig: { multiTenantEnabled },
    reloadConfig: vi.fn(),
  };

  return render(
    <userContext.Provider value={userValue}>
      <locationContext.Provider value={locationValue}>
        <TenantPage />
      </locationContext.Provider>
    </userContext.Provider>,
  );
}

describe("single-tenant organization settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTableMock.mockReturnValue({
      page: 1,
      pageSize: 20,
      data: [rootTenant, childTenant],
      total: 2,
      setPage: vi.fn(),
      search: vi.fn(),
      reload: vi.fn(),
    });
    getTenantApiMock.mockResolvedValue(rootTenant);
  });

  it("loads only the root tenant and opens the organization editor", async () => {
    renderTenantPage(false);

    expect(await screen.findByText("Default Tenant")).toBeInTheDocument();
    expect(screen.getByText("tenant.profile")).toBeInTheDocument();
    expect(screen.queryByText("Child Tenant")).toBeNull();
    expect(screen.queryByPlaceholderText("tenant.search")).toBeNull();
    expect(getTenantApiMock).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByText("edit"));
    expect(screen.getByTestId("tenant-editor")).toHaveTextContent(
      "profile-mode",
    );
  });
});
