import { fireEvent, render, screen, waitFor } from "@/test/test-utils";
import type { Tenant, TenantDetail } from "@/types/api/tenant";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTenantDialog } from "./CreateTenantDialog";

const getTenantApiMock = vi.hoisted(() => vi.fn());
const updateTenantApiMock = vi.hoisted(() => vi.fn());
const captureRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/controllers/API/tenant", () => ({
  createTenantApi: vi.fn(),
  getTenantApi: getTenantApiMock,
  updateTenantApi: updateTenantApiMock,
}));
vi.mock("@/controllers/API/user", () => ({ getUsersApi: vi.fn() }));
vi.mock("@/controllers/request", () => ({
  captureAndAlertRequestErrorHoc: captureRequestMock,
}));
vi.mock("@/components/bs-ui/toast/use-toast", () => ({
  toast: vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const tenant: Tenant = {
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

const detail: TenantDetail = {
  ...tenant,
  root_dept_id: 1,
  contact_name: null,
  contact_phone: null,
  contact_email: null,
  quota_config: null,
  storage_config: null,
  admin_users: [],
};

describe("organization profile editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captureRequestMock.mockImplementation(<T,>(promise: Promise<T>) =>
      promise.catch(() => false),
    );
    getTenantApiMock.mockResolvedValue(detail);
    updateTenantApiMock.mockResolvedValue({ ...tenant, tenant_name: "Acme" });
  });

  it("updates the root tenant name with surrounding whitespace removed", async () => {
    const onSuccess = vi.fn();
    render(
      <CreateTenantDialog
        tenant={tenant}
        profileMode
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByText("tenant.profileEdit")).toBeInTheDocument();
    const nameInput = await screen.findByDisplayValue("Default Tenant");
    fireEvent.change(nameInput, { target: { value: "  Acme  " } });
    fireEvent.click(screen.getByText("confirm"));

    await waitFor(() =>
      expect(updateTenantApiMock).toHaveBeenCalledWith(1, {
        tenant_name: "Acme",
        logo: "",
        contact_name: "",
        contact_phone: "",
        contact_email: "",
      }),
    );
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it("keeps the editor open when the tenant update fails", async () => {
    const onSuccess = vi.fn();
    updateTenantApiMock.mockRejectedValue(new Error("update failed"));
    render(
      <CreateTenantDialog
        tenant={tenant}
        profileMode
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />,
    );

    const nameInput = await screen.findByDisplayValue("Default Tenant");
    fireEvent.change(nameInput, { target: { value: "Acme" } });
    fireEvent.click(screen.getByText("confirm"));

    await waitFor(() => expect(updateTenantApiMock).toHaveBeenCalledOnce());
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByText("tenant.profileEdit")).toBeInTheDocument();
  });
});
