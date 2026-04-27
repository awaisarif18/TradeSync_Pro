"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ScrollText, Settings, ShieldAlert, ServerCog } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { adminService } from "../../services/api";
import { RootState } from "../../redux/slices/store";
import { Button, Card, CardBody, EmptyState, Input, Pill, RoleBadge, Skeleton } from "../../components/ui";

type AdminRoleFilter = "ALL" | "MASTER" | "SLAVE" | "ADMIN";
type AdminTab = "users" | "nodes" | "audit" | "settings";
type UserRole = "MASTER" | "SLAVE" | "ADMIN";
type ActionKey = "license" | "status";

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  licenseKey: string | null;
  createdAt?: string;
};

type LoadingAction = {
  userId: string;
  action: ActionKey;
} | null;

const FILTERS: Array<{ value: AdminRoleFilter; label: string; countKey: keyof UserCounts }> = [
  { value: "ALL", label: "All Users", countKey: "all" },
  { value: "MASTER", label: "Providers", countKey: "masters" },
  { value: "SLAVE", label: "Copiers", countKey: "slaves" },
  { value: "ADMIN", label: "Admins", countKey: "admins" },
];

const ADMIN_TABS: Array<{ value: AdminTab; label: string; disabled?: boolean }> = [
  { value: "users", label: "Users" },
  { value: "nodes", label: "Nodes", disabled: true },
  { value: "audit", label: "Audit", disabled: true },
  { value: "settings", label: "Settings", disabled: true },
];

type UserCounts = {
  all: number;
  masters: number;
  slaves: number;
  admins: number;
};

function responseMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
}

function AdminTabs({
  activeTab,
  onChange,
}: {
  activeTab: AdminTab;
  onChange: (tab: AdminTab) => void;
}) {
  return (
    <div className="border-b border-[var(--color-line)]">
      <div className="mx-auto flex max-w-[1240px] gap-7 px-8">
        {ADMIN_TABS.map((tab) => {
          const active = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className="py-3 text-sm font-medium"
              style={{
                color: active ? "var(--color-text)" : "var(--color-text-2)",
                borderBottom: active
                  ? "2px solid var(--color-mint)"
                  : "2px solid transparent",
                fontStyle: tab.disabled ? "italic" : "normal",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-text-3)]">
        {label}
      </div>
      <div className="font-mono-tnum mt-1 text-xl font-semibold">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function PageHeader({ users }: { users: AdminUser[] }) {
  const activeCount = users.filter((user) => user.isActive).length;
  const disabledCount = users.filter((user) => !user.isActive).length;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-danger-soft)] text-[var(--color-danger)]">
          <ShieldAlert size={18} strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-3)]">
            ADMIN CONSOLE
          </div>
          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.025em]">
            System Administration
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-2)]">
            Manage users, licenses, and platform access.
          </p>
        </div>
      </div>
      <Card>
        <CardBody>
          <div className="grid min-w-[360px] grid-cols-3 gap-6">
            <HeaderStat label="TOTAL USERS" value={users.length} />
            <HeaderStat label="ACTIVE TODAY" value={activeCount} />
            <HeaderStat label="DISABLED" value={disabledCount} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function UserFilterChips({
  value,
  counts,
  search,
  onChange,
  onSearchChange,
}: {
  value: AdminRoleFilter;
  counts: UserCounts;
  search: string;
  onChange: (value: AdminRoleFilter) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = value === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onChange(filter.value)}
              style={{
                borderRadius: 9999,
                background: active ? "var(--color-mint-soft)" : "transparent",
              }}
            >
              <Pill variant={active ? "outline-mint" : "default"}>
                <span>{filter.label}</span>
                <span className="font-mono-tnum opacity-75">
                  ({counts[filter.countKey]})
                </span>
              </Pill>
            </button>
          );
        })}
      </div>
      <div className="w-full lg:max-w-sm">
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          leftIcon={<Search size={15} />}
          placeholder="Search by name, email, or license key..."
          style={{ background: "var(--color-bg)" }}
        />
      </div>
    </div>
  );
}

function StatusCell({ isActive }: { isActive: boolean }) {
  return (
    <span
      className="font-mono-tnum inline-flex items-center gap-2 text-xs"
      style={{ color: isActive ? "var(--color-mint)" : "var(--color-text-3)" }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: isActive ? "var(--color-mint)" : "transparent",
          border: isActive ? undefined : "1.5px solid var(--color-text-3)",
        }}
      />
      {isActive ? "Active" : "Disabled"}
    </span>
  );
}

function LicenseCell({ user }: { user: AdminUser }) {
  if (user.role !== "MASTER") {
    return <span className="font-mono-tnum text-[var(--color-text-3)]">--</span>;
  }

  if (user.licenseKey === null) {
    return (
      <div>
        <span className="font-mono-tnum text-[var(--color-text-3)]">--</span>
        <div className="mt-1 text-xs italic text-[var(--color-text-3)]">
          not issued
        </div>
      </div>
    );
  }

  return (
    <Pill variant="mint">
      <span className="font-mono-tnum">{user.licenseKey}</span>
    </Pill>
  );
}

function UserTableRow({
  user,
  loadingAction,
  onIssueLicense,
  onRegenerate,
  onToggleStatus,
}: {
  user: AdminUser;
  loadingAction: LoadingAction;
  onIssueLicense: (user: AdminUser) => void;
  onRegenerate: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser) => void;
}) {
  const licenseLoading =
    loadingAction?.userId === user.id && loadingAction.action === "license";
  const statusLoading =
    loadingAction?.userId === user.id && loadingAction.action === "status";
  const enableAction = !user.isActive;

  return (
    <div
      className="grid grid-cols-[minmax(220px,1.5fr)_140px_minmax(220px,1.3fr)_130px_minmax(220px,1fr)] items-center gap-4 border-b border-[var(--color-line)] px-6 py-4 text-sm transition-colors hover:bg-white/[0.02]"
      style={{ opacity: user.isActive ? 1 : 0.6 }}
    >
      <div>
        <div className="font-medium">{user.fullName}</div>
        <div className="mt-1 text-xs text-[var(--color-text-2)]">
          {user.email}
        </div>
      </div>
      <div>
        <RoleBadge role={user.role} />
      </div>
      <div>
        <LicenseCell user={user} />
      </div>
      <div>
        <StatusCell isActive={user.isActive} />
      </div>
      <div className="flex justify-end gap-2">
        {user.role === "ADMIN" ? (
          <span className="text-sm italic text-[var(--color-text-3)]">
            Protected
          </span>
        ) : (
          <>
            {user.role === "MASTER" ? (
              <Button
                variant="ghost-mint"
                size="sm"
                loading={licenseLoading}
                onClick={() =>
                  user.licenseKey ? onRegenerate(user) : onIssueLicense(user)
                }
              >
                {user.licenseKey ? "Regenerate Key" : "Issue Key"}
              </Button>
            ) : null}
            <Button
              variant={enableAction ? "ghost-mint" : "ghost-danger"}
              size="sm"
              loading={statusLoading}
              onClick={() => onToggleStatus(user)}
            >
              {enableAction ? "Enable" : "Disable"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function UserTable({
  users,
  loadingAction,
  onIssueLicense,
  onRegenerate,
  onToggleStatus,
}: {
  users: AdminUser[];
  loadingAction: LoadingAction;
  onIssueLicense: (user: AdminUser) => void;
  onRegenerate: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser) => void;
}) {
  return (
    <Card>
      <div className="min-w-[960px]">
        <div className="grid grid-cols-[minmax(220px,1.5fr)_140px_minmax(220px,1.3fr)_130px_minmax(220px,1fr)] gap-4 border-b border-[var(--color-line)] px-6 py-4 text-[11px] uppercase tracking-[0.08em] text-[var(--color-text-3)]">
          <div>User</div>
          <div>Role</div>
          <div>License Key</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        {users.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--color-text-3)]">
            No users match the selected filter.
          </div>
        ) : (
          users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              loadingAction={loadingAction}
              onIssueLicense={onIssueLicense}
              onRegenerate={onRegenerate}
              onToggleStatus={onToggleStatus}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function LoadingTable() {
  return (
    <Card>
      <CardBody>
        <div className="space-y-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[1.5fr_0.8fr_1.3fr_0.8fr_1fr] gap-6">
              <Skeleton width="80%" />
              <Skeleton width="55%" />
              <Skeleton width="70%" />
              <Skeleton width="65%" />
              <Skeleton width="90%" />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function AdminStubs() {
  const stubs = [
    {
      title: "Nodes",
      icon: <ServerCog size={24} />,
      description:
        "Real-time view of every connected desktop client, their health state, last signal received, and reconnect history.",
    },
    {
      title: "Audit",
      icon: <ScrollText size={24} />,
      description:
        "Searchable log of every privileged action: license generations, status toggles, profile changes, with operator attribution and timestamps.",
    },
    {
      title: "Settings",
      icon: <Settings size={24} />,
      description:
        "Platform-wide controls: license key prefix, default risk caps, broadcast policies, and CORS origin allowlist.",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {stubs.map((stub) => (
        <Card key={stub.title} style={{ opacity: 0.5 }}>
          <CardBody>
            <div className="mb-4 flex justify-end text-xs italic text-[var(--color-text-3)]">
              disabled
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 text-[var(--color-text-3)]">{stub.icon}</div>
              <h3 className="text-lg font-semibold">Coming soon</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-2)]">
                {stub.description}
              </p>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export default function AdminDashboard() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [roleFilter, setRoleFilter] = useState<AdminRoleFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [isAuthenticated, user?.role, router]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = (await adminService.getUsers()) as AdminUser[];
      setUsers(data);
      setError(null);
    } catch (fetchError) {
      console.error("Failed to fetch users", fetchError);
      setError("Failed to load admin users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === "ADMIN") {
      fetchUsers();
    }
  }, [fetchUsers, isAuthenticated, user?.role]);

  const counts = useMemo<UserCounts>(
    () => ({
      all: users.length,
      masters: users.filter((adminUser) => adminUser.role === "MASTER").length,
      slaves: users.filter((adminUser) => adminUser.role === "SLAVE").length,
      admins: users.filter((adminUser) => adminUser.role === "ADMIN").length,
    }),
    [users],
  );

  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users.filter((adminUser) => {
      const matchesRole =
        roleFilter === "ALL" || adminUser.role === roleFilter;
      const matchesSearch =
        query.length === 0 ||
        adminUser.fullName.toLowerCase().includes(query) ||
        adminUser.email.toLowerCase().includes(query) ||
        (adminUser.licenseKey?.toLowerCase().includes(query) ?? false);

      return matchesRole && matchesSearch;
    });
  }, [roleFilter, search, users]);

  const handleGenerateLicense = async (adminUser: AdminUser) => {
    setLoadingAction({ userId: adminUser.id, action: "license" });
    try {
      const result = (await adminService.generateLicense(adminUser.id)) as {
        licenseKey: string;
      };
      toast.success(`License key generated: ${result.licenseKey}`);
      await fetchUsers();
    } catch (licenseError) {
      console.error("Failed to generate license", licenseError);
      toast.error(responseMessage(licenseError, "Failed to generate license"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleStatus = async (adminUser: AdminUser) => {
    setLoadingAction({ userId: adminUser.id, action: "status" });
    try {
      const result = (await adminService.toggleUserStatus(adminUser.id)) as {
        isActive: boolean;
      };
      toast.success(result.isActive ? "User enabled" : "User disabled");
      await fetchUsers();
    } catch (statusError) {
      console.error("Failed to update user status", statusError);
      toast.error(responseMessage(statusError, "Failed to update user status"));
    } finally {
      setLoadingAction(null);
    }
  };

  if (!isAuthenticated || user?.role !== "ADMIN") return null;

  return (
    <div className="animate-in fade-in duration-500">
      <AdminTabs activeTab={activeTab} onChange={setActiveTab} />
      <div className="mx-auto max-w-[1240px] space-y-6 px-8 py-8 pb-20">
        <PageHeader users={users} />

        {activeTab === "users" ? (
          <>
            <UserFilterChips
              value={roleFilter}
              counts={counts}
              search={search}
              onChange={setRoleFilter}
              onSearchChange={setSearch}
            />
            {isLoading ? (
              <LoadingTable />
            ) : error ? (
              <Card>
                <EmptyState
                  icon={<ShieldAlert size={22} />}
                  title="Admin users could not be loaded."
                  description={error}
                  action={<Button onClick={fetchUsers}>Retry</Button>}
                />
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <UserTable
                  users={visibleUsers}
                  loadingAction={loadingAction}
                  onIssueLicense={handleGenerateLicense}
                  onRegenerate={handleGenerateLicense}
                  onToggleStatus={handleToggleStatus}
                />
              </div>
            )}
          </>
        ) : (
          <AdminStubs />
        )}
      </div>
    </div>
  );
}
