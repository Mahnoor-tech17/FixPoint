import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Filter,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { getErrorMessage, httpClient } from "../../lib/http";
import { getUser } from "../../lib/local-storage";

const editUserSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^03\d{9}$/.test(val.replace(/[-\s]/g, "")), {
      message: "Pakistani format e.g. 03XXXXXXXXX (11 digits)",
    }),
});


const createUserSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^03\d{9}$/.test(val.replace(/[-\s]/g, "")), {
      message: "Pakistani format e.g. 03XXXXXXXXX (11 digits)",
    }),
});

const ROLE_BADGES = {
  ADMIN: "bg-pastel-pink text-rose-900 border-rose-200",
  PROVIDER: "bg-pastel-yellow text-amber-900 border-amber-200",
  CUSTOMER: "bg-pastel-mint text-emerald-900 border-emerald-200",
};

export default function AdminUsers() {
  const currentUser = getUser();
  const currentUserId = currentUser?._id || currentUser?.id;

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modals
  const [viewingUser, setViewingUser] = useState(null);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [editErrors, setEditErrors] = useState({});
  const [updating, setUpdating] = useState(false);

  const [togglingBlockUser, setTogglingBlockUser] = useState(null);
  const [blocking, setBlocking] = useState(false);

  const [deletingUser, setDeletingUser] = useState(null);
  // Create user modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateErrors({});
    const normalizedPhone = createForm.phone ? createForm.phone.replace(/[-\s]/g, "") : "";
    const result = createUserSchema.safeParse({
      ...createForm,
      phone: normalizedPhone,
    });
    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setCreateErrors(fieldErrors);
      return;
    }
    try {
      setCreating(true);
      const res = await httpClient.post("/admin/users", {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        phone: normalizedPhone || undefined,
        role: "CUSTOMER",
      });
      toast.success(res.data.message || "Customer created successfully!");
      setIsCreateOpen(false);
      setCreateForm({ firstName: "", lastName: "", email: "", password: "", phone: "" });
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { page, limit };
      if (roleFilter) params.role = roleFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await httpClient.get("/admin/users", { params });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, debouncedSearch]);

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      phone: u.phone || "",
    });
    setEditErrors({});
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditErrors({});

    const normalizedPhone = editForm.phone ? editForm.phone.replace(/[-\s]/g, "") : "";

    const result = editUserSchema.safeParse({
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      phone: normalizedPhone,
    });

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setEditErrors(fieldErrors);
      return;
    }

    try {
      setUpdating(true);
      const res = await httpClient.put(`/admin/users/${editingUser._id}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: normalizedPhone || undefined,
      });

      toast.success(res.data.message || "User updated successfully");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const handleBlockConfirm = async () => {
    if (!togglingBlockUser) return;
    try {
      setBlocking(true);
      const updatedStatus = !togglingBlockUser.isBlocked;
      const res = await httpClient.put(`/admin/users/${togglingBlockUser._id}`, {
        isBlocked: updatedStatus,
      });
      toast.success(
        res.data.message || `User ${updatedStatus ? "blocked" : "unblocked"} successfully`
      );
      setTogglingBlockUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBlocking(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    try {
      setDeleting(true);
      const res = await httpClient.delete(`/admin/users/${deletingUser._id}`);
      toast.success(res.data.message || "User deleted successfully");
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout title="Users">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            View, search, edit, block, or delete platform users.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-slate-500">
            Total Users: <span className="text-ink">{total}</span>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-dark flex items-center gap-1.5 text-xs py-2 px-3.5"
          >
            <Plus className="h-4 w-4" /> Create Customer
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 rounded-3xl bg-white p-4 shadow-xs border border-black/5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by first name, last name, or email..."
              className="w-full rounded-2xl border border-black/10 bg-soft/50 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-ink focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Role selector */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-2xl border border-black/10 bg-soft/50 px-4 py-2.5 text-sm outline-none transition focus:border-ink focus:bg-white"
            >
              <option value="">All roles</option>
              <option value="CUSTOMER">Customer</option>
              <option value="PROVIDER">Provider</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="rounded-3xl bg-white p-8 shadow-xs border border-black/5">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center shadow-xs border border-black/5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pastel-blue text-ink">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-ink">No users found</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {search || roleFilter
              ? "Try clearing your filters or searching for different keywords."
              : "Registered users will appear here."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-xs border border-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 bg-soft/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Registered</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {users.map((u) => {
                  const isSelf = Boolean(
                    currentUserId && (u._id === currentUserId || u.email === currentUser?.email)
                  );
                  const isAdmin = u.role === "ADMIN";

                  return (
                    <tr key={u._id} className="hover:bg-soft/30 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.profilePhoto ? (
                            <img
                              src={u.profilePhoto}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover border border-black/10 shrink-0"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-xs font-bold text-ink">
                              {u.firstName?.[0]}
                              {u.lastName?.[0]}
                            </span>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-ink">
                                {u.firstName} {u.lastName}
                              </p>
                              {isSelf && (
                                <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  You
                                </span>
                              )}
                            </div>
                            {u.serviceCategory && (
                              <p className="text-xs text-slate-400 capitalize">
                                {u.serviceCategory}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {u.email}
                          </p>
                          {u.phone && (
                            <p className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {u.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
                            ROLE_BADGES[u.role] || "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                            u.isBlocked
                              ? "bg-rose-100 text-rose-800"
                              : "bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {u.isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingUser(u)}
                            title="View details"
                            className="rounded-full p-2 text-slate-400 hover:bg-soft hover:text-ink transition"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => openEditModal(u)}
                            disabled={isAdmin}
                            title={isAdmin ? "Admin accounts cannot be modified here" : "Edit user"}
                            className="rounded-full p-2 text-slate-500 hover:bg-soft hover:text-ink transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* Block/Unblock button (cannot block oneself or admins) */}
                          <button
                            onClick={() => setTogglingBlockUser(u)}
                            disabled={isSelf || isAdmin}
                            title={
                              isSelf
                                ? "You cannot block yourself"
                                : isAdmin
                                ? "Admin cannot be blocked"
                                : u.isBlocked
                                ? "Unblock user"
                                : "Block user"
                            }
                            className={`rounded-full p-2 transition disabled:opacity-30 disabled:cursor-not-allowed ${
                              u.isBlocked
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                            }`}
                          >
                            {u.isBlocked ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </button>

                          {/* Delete button (cannot delete oneself or admins) */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={isSelf || isAdmin}
                            title={
                              isSelf
                                ? "You cannot delete yourself"
                                : isAdmin
                                ? "Admin cannot be deleted"
                                : "Delete user"
                            }
                            className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-black/5 bg-soft/30 px-6 py-4">
              <p className="text-xs text-slate-500">
                Page <span className="font-bold text-ink">{page}</span> of{" "}
                <span className="font-bold text-ink">{pages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-full border border-black/10 bg-white p-2 text-slate-600 hover:bg-soft disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="rounded-full border border-black/10 bg-white p-2 text-slate-600 hover:bg-soft disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View Details Modal */}
      <Modal
        isOpen={Boolean(viewingUser)}
        onClose={() => setViewingUser(null)}
        title="User details"
      >
        {viewingUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-2xl bg-soft p-4">
              {viewingUser.profilePhoto ? (
                <img
                  src={viewingUser.profilePhoto}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover border border-black/10"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pastel-yellow text-sm font-bold text-ink">
                  {viewingUser.firstName?.[0]}
                  {viewingUser.lastName?.[0]}
                </span>
              )}
              <div>
                <h4 className="text-base font-bold text-ink">
                  {viewingUser.firstName} {viewingUser.lastName}
                </h4>
                <p className="text-xs text-slate-500">{viewingUser.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      ROLE_BADGES[viewingUser.role] || "bg-slate-100"
                    }`}
                  >
                    {viewingUser.role}
                  </span>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      viewingUser.isBlocked
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {viewingUser.isBlocked ? "Blocked" : "Active"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-black/5 p-3">
                <span className="text-slate-400 block mb-1">Phone Number</span>
                <span className="font-bold text-ink">{viewingUser.phone || "Not provided"}</span>
              </div>
              <div className="rounded-2xl border border-black/5 p-3">
                <span className="text-slate-400 block mb-1">Email Verified</span>
                <span className="font-bold text-ink">
                  {viewingUser.isVerified ? "Yes" : "No"}
                </span>
              </div>
              {viewingUser.serviceCategory && (
                <div className="rounded-2xl border border-black/5 p-3">
                  <span className="text-slate-400 block mb-1">Service Category</span>
                  <span className="font-bold text-ink uppercase">
                    {viewingUser.serviceCategory}
                  </span>
                </div>
              )}
              {viewingUser.providerStatus && (
                <div className="rounded-2xl border border-black/5 p-3">
                  <span className="text-slate-400 block mb-1">Provider Status</span>
                  <span className="font-bold text-ink capitalize">
                    {viewingUser.providerStatus}
                  </span>
                </div>
              )}
              <div className="rounded-2xl border border-black/5 p-3">
                <span className="text-slate-400 block mb-1">Registered On</span>
                <span className="font-bold text-ink">
                  {new Date(viewingUser.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="rounded-2xl border border-black/5 p-3">
                <span className="text-slate-400 block mb-1">Last Updated</span>
                <span className="font-bold text-ink">
                  {new Date(viewingUser.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button onClick={() => setViewingUser(null)} className="btn-light">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Edit user"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                First name *
              </label>
              <input
                type="text"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                className="input-field"
                autoFocus
              />
              {editErrors.firstName && (
                <p className="mt-1 text-xs text-red-500">{editErrors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Last name *
              </label>
              <input
                type="text"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                className="input-field"
              />
              {editErrors.lastName && (
                <p className="mt-1 text-xs text-red-500">{editErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Phone number
            </label>
            <input
              type="text"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="03001234567"
              className="input-field font-mono"
            />
            {editErrors.phone && (
              <p className="mt-1 text-xs text-red-500">{editErrors.phone}</p>
            )}
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="btn-light w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="btn-primary w-full sm:w-auto"
            >
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Block / Unblock Confirm */}
      <ConfirmDialog
        isOpen={Boolean(togglingBlockUser)}
        onClose={() => setTogglingBlockUser(null)}
        onConfirm={handleBlockConfirm}
        title={togglingBlockUser?.isBlocked ? "Unblock user?" : "Block user?"}
        message={
          togglingBlockUser?.isBlocked
            ? `Are you sure you want to unblock ${togglingBlockUser?.firstName} ${togglingBlockUser?.lastName}? They will be able to log in again.`
            : `Are you sure you want to block ${togglingBlockUser?.firstName} ${togglingBlockUser?.lastName}? They will be immediately prevented from logging into the platform.`
        }
        confirmText={togglingBlockUser?.isBlocked ? "Unblock" : "Block user"}
        confirmVariant={togglingBlockUser?.isBlocked ? "primary" : "danger"}
        isLoading={blocking}
      />

      {/* Delete User Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete user"
        message={`Are you sure you want to permanently delete ${deletingUser?.firstName} ${deletingUser?.lastName} (${deletingUser?.email})? This action cannot be reversed.`}
        confirmText="Permanently delete"
        confirmVariant="danger"
        isLoading={deleting}
      />
      {/* Create Customer Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Customer"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                First name *
              </label>
              <input
                type="text"
                value={createForm.firstName}
                onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                className="input-field"
                placeholder="John"
                autoFocus
              />
              {createErrors.firstName && (
                <p className="mt-1 text-xs text-red-500">{createErrors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Last name *
              </label>
              <input
                type="text"
                value={createForm.lastName}
                onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                className="input-field"
                placeholder="Doe"
              />
              {createErrors.lastName && (
                <p className="mt-1 text-xs text-red-500">{createErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Email address *
            </label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="customer@example.com"
              className="input-field"
            />
            {createErrors.email && (
              <p className="mt-1 text-xs text-red-500">{createErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Password *
            </label>
            <input
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              placeholder="Min 6 characters"
              className="input-field"
            />
            {createErrors.password && (
              <p className="mt-1 text-xs text-red-500">{createErrors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Phone number (optional)
            </label>
            <input
              type="text"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              placeholder="03001234567"
              className="input-field font-mono"
            />
            {createErrors.phone && (
              <p className="mt-1 text-xs text-red-500">{createErrors.phone}</p>
            )}
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="btn-light w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary w-full sm:w-auto"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create customer
            </button>
          </div>
        </form>
      </Modal>

    </AdminLayout>
  );
}
