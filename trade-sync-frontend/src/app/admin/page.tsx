"use client";
import { useEffect, useState } from "react";
import { adminService } from "../../services/api";
import { ShieldAlert, Key, Power, PowerOff, Users } from "lucide-react";

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // NEW: State to track which filter is currently active
  const [roleFilter, setRoleFilter] = useState<
    "ALL" | "MASTER" | "SLAVE" | "ADMIN"
  >("ALL");

  const fetchUsers = async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleGenerateLicense = async (userId: string) => {
    try {
      await adminService.generateLicense(userId);
      alert("License generated successfully!");
      fetchUsers();
    } catch (error: any) {
      alert(
        "Error: " + (error.response?.data?.message || "Failed to generate"),
      );
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await adminService.toggleUserStatus(userId);
      fetchUsers();
    } catch (error: any) {
      alert(
        "Error: " +
          (error.response?.data?.message || "Failed to update status"),
      );
    }
  };

  if (isLoading)
    return <div className="p-10 text-white">Loading Admin Systems...</div>;

  // NEW: Filter the users array based on the selected tab before mapping
  const filteredUsers = users.filter(
    (user) => roleFilter === "ALL" || user.role === roleFilter,
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <ShieldAlert className="text-red-500" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-white">
              System Administration
            </h1>
            <p className="text-slate-400 text-sm">
              Manage users, licenses, and platform access.
            </p>
          </div>
        </div>
      </div>

      {/* NEW: Filter Toggle Tabs */}
      <div className="flex space-x-2 bg-slate-900/50 p-1 rounded-lg w-max border border-slate-800">
        {["ALL", "MASTER", "SLAVE", "ADMIN"].map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              roleFilter === role
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {role === "ALL" ? "All Users" : role + "S"}
          </button>
        ))}
      </div>

      {/* User Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">License Key</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No users found for this category.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">
                      {user.fullName}
                    </div>
                    <div className="text-slate-500 text-xs">{user.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-bold tracking-wider ${
                        user.role === "ADMIN"
                          ? "bg-red-500/20 text-red-400"
                          : user.role === "MASTER"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">
                    {user.licenseKey ? user.licenseKey : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`flex items-center space-x-2 text-xs font-medium ${user.isActive ? "text-green-400" : "text-slate-500"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${user.isActive ? "bg-green-500 animate-pulse" : "bg-slate-600"}`}
                      ></div>
                      <span>{user.isActive ? "Active" : "Disabled"}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {user.role === "MASTER" && (
                      <button
                        onClick={() => handleGenerateLicense(user.id)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                      >
                        <Key size={14} className="mr-1" /> Key
                      </button>
                    )}
                    {user.role !== "ADMIN" && (
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        className={`inline-flex items-center px-3 py-1.5 text-white rounded-md transition-colors ${
                          user.isActive
                            ? "bg-red-900/50 hover:bg-red-600 border border-red-800"
                            : "bg-green-900/50 hover:bg-green-600 border border-green-800"
                        }`}
                      >
                        {user.isActive ? (
                          <PowerOff size={14} className="mr-1" />
                        ) : (
                          <Power size={14} className="mr-1" />
                        )}
                        {user.isActive ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
