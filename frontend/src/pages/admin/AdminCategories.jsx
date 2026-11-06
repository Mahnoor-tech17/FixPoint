import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Edit2,
  Layers,
  Loader2,
  Plus,
  Power,
  Trash2,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { getErrorMessage, httpClient } from "../../lib/http";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50, "Name is too long"),
  description: z.string().trim().max(300, "Description cannot exceed 300 characters").optional(),
  icon: z.string().trim().optional(),
});

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/admin/categories");
      setCategories(res.data.categories || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setFormName("");
    setFormDescription("");
    setFormIcon("");
    setFormIsActive(true);
    setFormErrors({});
    setIsAddOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormName(cat.name || "");
    setFormDescription(cat.description || "");
    setFormIcon(cat.icon || "");
    setFormIsActive(cat.isActive ?? true);
    setFormErrors({});
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const result = categorySchema.safeParse({
      name: formName,
      description: formDescription,
      icon: formIcon,
    });

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setFormErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      const res = await httpClient.post("/admin/categories", {
        name: formName.trim(),
        description: formDescription.trim(),
        icon: formIcon.trim(),
      });
      toast.success(res.data.message || "Category created successfully");
      setIsAddOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingCategory) return;
    setFormErrors({});

    const result = categorySchema.safeParse({
      name: formName,
      description: formDescription,
      icon: formIcon,
    });

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setFormErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      const res = await httpClient.put(`/admin/categories/${editingCategory._id}`, {
        name: formName.trim(),
        description: formDescription.trim(),
        icon: formIcon.trim(),
        isActive: formIsActive,
      });
      toast.success(res.data.message || "Category updated successfully");
      setEditingCategory(null);
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat) => {
    try {
      const updatedStatus = !cat.isActive;
      await httpClient.put(`/admin/categories/${cat._id}`, {
        isActive: updatedStatus,
      });
      toast.success(`Category ${updatedStatus ? "activated" : "deactivated"}`);
      setCategories((prev) =>
        prev.map((c) => (c._id === cat._id ? { ...c, isActive: updatedStatus } : c))
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategory) return;
    try {
      setDeleting(true);
      const res = await httpClient.delete(`/admin/categories/${deletingCategory._id}`);
      toast.success(res.data.message || "Category deleted successfully");
      setDeletingCategory(null);
      fetchCategories();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout title="Categories">
      {/* Header bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Manage service categories offered across FixPoint platform.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-dark self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Add category
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="rounded-3xl bg-white p-8 shadow-xs">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pastel-yellow text-ink">
            <Layers className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-ink">No categories yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Create categories like Home Cleaning, Plumbing, or Electrician to get started.
          </p>
          <button onClick={openAddModal} className="btn-dark mt-6">
            <Plus className="h-4 w-4" /> Add first category
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-xs border border-black/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 bg-soft/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {categories.map((cat) => (
                  <tr key={cat._id} className="hover:bg-soft/30 transition">
                    <td className="px-6 py-4 font-bold text-ink">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pastel-blue text-xs font-bold text-ink">
                          {cat.icon || cat.name?.[0]?.toUpperCase()}
                        </span>
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{cat.slug}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {cat.description || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                          cat.isActive
                            ? "bg-pastel-mint text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {cat.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(cat)}
                          title={cat.isActive ? "Deactivate" : "Activate"}
                          className={`rounded-full p-2 transition ${
                            cat.isActive
                              ? "text-slate-400 hover:bg-soft hover:text-ink"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(cat)}
                          title="Edit"
                          className="rounded-full p-2 text-slate-500 hover:bg-soft hover:text-ink transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCategory(cat)}
                          title="Delete"
                          className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add category">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Name *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Electrician, Plumbing"
              className="input-field"
              autoFocus
            />
            {formErrors.name && (
              <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief details about what services belong here"
              className="input-field resize-none"
            />
            {formErrors.description && (
              <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Icon / Keyword
            </label>
            <input
              type="text"
              value={formIcon}
              onChange={(e) => setFormIcon(e.target.value)}
              placeholder="e.g. zap, wrench, sparkles"
              className="input-field"
            />
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="btn-light w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full sm:w-auto"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create category
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={Boolean(editingCategory)}
        onClose={() => setEditingCategory(null)}
        title="Edit category"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Name *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="input-field"
            />
            {formErrors.name && (
              <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Slug (read-only)
            </label>
            <input
              type="text"
              value={editingCategory?.slug || ""}
              disabled
              className="input-field bg-slate-100 text-slate-500 cursor-not-allowed font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="input-field resize-none"
            />
            {formErrors.description && (
              <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Icon / Keyword
            </label>
            <input
              type="text"
              value={formIcon}
              onChange={(e) => setFormIcon(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-soft p-4">
            <div>
              <p className="text-sm font-bold text-ink">Active status</p>
              <p className="text-xs text-slate-500">
                Inactive categories are hidden from landing page & provider invites.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormIsActive(!formIsActive)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
                formIsActive ? "bg-ink" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform mt-0.5 ml-0.5 ${
                  formIsActive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingCategory(null)}
              className="btn-light w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full sm:w-auto"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? If any provider is linked to this category, the backend will prevent deletion and require you to deactivate it instead.`}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={deleting}
      />
    </AdminLayout>
  );
}
