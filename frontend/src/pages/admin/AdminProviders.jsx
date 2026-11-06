import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Briefcase,
  Calendar,
  Filter,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  User,
  X,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";
import { getErrorMessage, httpClient } from "../../lib/http";

const STATUS_BADGES = {
  invited: { label: "Invited", bg: "bg-pastel-yellow text-amber-900 border-amber-200" },
  pending_verification: { label: "Pending verification", bg: "bg-pastel-blue text-blue-900 border-blue-200" },
  approved: { label: "Approved", bg: "bg-pastel-mint text-emerald-900 border-emerald-200" },
  rejected: { label: "Rejected", bg: "bg-pastel-pink text-rose-900 border-rose-200" },
};

const inviteSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^03\d{9}$/.test(val.replace(/[-\s]/g, "")), {
      message: "Pakistani format e.g. 03XXXXXXXXX (11 digits)",
    }),
  serviceCategory: z.string().min(1, "Please select an active category"),
});

export default function AdminProviders() {
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    serviceCategory: "",
  });
  const [inviteErrors, setInviteErrors] = useState({});
  const [inviting, setInviting] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load categories
  useEffect(() => {
    httpClient
      .get("/admin/categories")
      .then((res) => setCategories(res.data.categories || []))
      .catch((err) => console.error("Could not fetch categories:", err));
  }, []);

  // Fetch providers whenever filters change
  const fetchProviders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;

      const res = await httpClient.get("/admin/providers", { params });
      setProviders(res.data.providers || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [debouncedSearch, statusFilter, categoryFilter]);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  const openInviteModal = () => {
    setInviteForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      serviceCategory: activeCategories[0]?.slug || "",
    });
    setInviteErrors({});
    setIsInviteOpen(true);
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteErrors({});

    const normalizedPhone = inviteForm.phone ? inviteForm.phone.replace(/[-\s]/g, "") : "";

    const result = inviteSchema.safeParse({
      ...inviteForm,
      phone: normalizedPhone,
    });

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setInviteErrors(fieldErrors);
      return;
    }

    try {
      setInviting(true);
      const res = await httpClient.post("/admin/providers/invite", {
        firstName: inviteForm.firstName.trim(),
        lastName: inviteForm.lastName.trim(),
        email: inviteForm.email.trim().toLowerCase(),
        phone: normalizedPhone || undefined,
        serviceCategory: inviteForm.serviceCategory,
      });

      toast.success(res.data.message || "Provider invited successfully!");
      setIsInviteOpen(false);
      fetchProviders();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("");
    setCategoryFilter("");
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter || categoryFilter);

  return (
    <AdminLayout title="Providers">
      {/* Header with Invite button */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            View, filter and invite service providers to FixPoint.
          </p>
        </div>
        <button onClick={openInviteModal} className="btn-dark self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Invite provider
        </button>
      </div>

      {/* Filters Bar */}
      <div className="mb-6 rounded-3xl bg-white p-4 shadow-xs border border-black/5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-2xl border border-black/10 bg-soft/50 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-ink focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-soft/50 px-4 py-2.5 text-sm outline-none transition focus:border-ink focus:bg-white"
            >
              <option value="">All statuses</option>
              <option value="invited">Invited</option>
              <option value="pending_verification">Pending verification</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-soft/50 px-4 py-2.5 text-sm outline-none transition focus:border-ink focus:bg-white"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          <div className="flex items-center">
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="btn-light w-full py-2.5 text-xs font-semibold"
              >
                Clear filters
              </button>
            ) : (
              <div className="text-xs text-slate-400 px-2 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Total {providers.length} provider(s)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="rounded-3xl bg-white p-8 shadow-xs border border-black/5">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center shadow-xs border border-black/5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pastel-peach text-ink">
            <Briefcase className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-ink">
            {hasActiveFilters ? "No matching providers" : "No providers yet"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {hasActiveFilters
              ? "Try adjusting your filters or search keywords."
              : "Invite skilled professionals like electricians, plumbers and cleaners to get started."}
          </p>
          {hasActiveFilters ? (
            <button onClick={clearFilters} className="btn-light mt-6">
              Reset filters
            </button>
          ) : (
            <button onClick={openInviteModal} className="btn-dark mt-6">
              <Plus className="h-4 w-4" /> Invite first provider
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-xs border border-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 bg-soft/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Provider</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Reg. Fee</th>
                  <th className="px-6 py-4">Joined / Invited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {providers.map((p) => {
                  const badge = STATUS_BADGES[p.providerStatus] || {
                    label: p.providerStatus,
                    bg: "bg-slate-100 text-slate-700",
                  };

                  return (
                    <tr key={p._id} className="hover:bg-soft/30 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {p.profilePhoto ? (
                            <img
                              src={p.profilePhoto}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover border border-black/10 shrink-0"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pastel-yellow text-xs font-bold text-ink">
                              {p.firstName?.[0]}
                              {p.lastName?.[0]}
                            </span>
                          )}
                          <div>
                            <p className="font-bold text-ink">
                              {p.firstName} {p.lastName}
                            </p>
                            {p.city && (
                              <p className="text-xs text-slate-400">{p.city}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {p.email}
                          </p>
                          {p.phone && (
                            <p className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {p.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-soft px-3 py-1 text-xs font-semibold text-ink uppercase tracking-wide">
                          {p.serviceCategory || "—"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                        {p.rejectionReason && p.providerStatus === "rejected" && (
                          <p className="mt-1 text-[11px] text-rose-600 max-w-xs truncate" title={p.rejectionReason}>
                            Reason: {p.rejectionReason}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {p.registrationFeePaid ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-pastel-mint px-3 py-1 text-xs font-bold text-emerald-900">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-pastel-yellow px-3 py-1 text-xs font-bold text-amber-900">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Provider Modal */}
      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite provider">
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div className="rounded-2xl bg-pastel-blue/60 p-4 text-xs text-blue-900 leading-relaxed">
            <b>Note:</b> A secure temporary password will be automatically generated and emailed to the provider. They will use it to log in and complete their verification.
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                First name *
              </label>
              <input
                type="text"
                value={inviteForm.firstName}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, firstName: e.target.value })
                }
                placeholder="Ahmed"
                className="input-field"
                autoFocus
              />
              {inviteErrors.firstName && (
                <p className="mt-1 text-xs text-red-500">{inviteErrors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Last name *
              </label>
              <input
                type="text"
                value={inviteForm.lastName}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, lastName: e.target.value })
                }
                placeholder="Khan"
                className="input-field"
              />
              {inviteErrors.lastName && (
                <p className="mt-1 text-xs text-red-500">{inviteErrors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Email address *
            </label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, email: e.target.value })
              }
              placeholder="provider@example.com"
              className="input-field"
            />
            {inviteErrors.email && (
              <p className="mt-1 text-xs text-red-500">{inviteErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Phone number (optional)
            </label>
            <input
              type="text"
              value={inviteForm.phone}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, phone: e.target.value })
              }
              placeholder="03001234567"
              className="input-field font-mono"
            />
            {inviteErrors.phone && (
              <p className="mt-1 text-xs text-red-500">{inviteErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Service category *
            </label>
            {activeCategories.length === 0 ? (
              <p className="text-xs text-red-500 py-2">
                No active categories found. Please create or activate a category first.
              </p>
            ) : (
              <select
                value={inviteForm.serviceCategory}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, serviceCategory: e.target.value })
                }
                className="input-field"
              >
                {activeCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name} ({c.slug})
                  </option>
                ))}
              </select>
            )}
            {inviteErrors.serviceCategory && (
              <p className="mt-1 text-xs text-red-500">{inviteErrors.serviceCategory}</p>
            )}
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="btn-light w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviting || activeCategories.length === 0}
              className="btn-primary w-full sm:w-auto"
            >
              {inviting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send invitation
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
