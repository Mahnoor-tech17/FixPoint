import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertCircle,
  Check,
  Clock,
  DollarSign,
  Edit2,
  Image as ImageIcon,
  Loader2,
  Plus,
  Power,
  ShieldAlert,
  Trash2,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { getErrorMessage, httpClient } from "../../lib/http";
import { useProviderStatus } from "../../components/provider/useProviderStatus";

const SERVICE_TYPES = [
  { value: "repair", label: "Repair" },
  { value: "installation", label: "Installation" },
  { value: "maintenance", label: "Maintenance" },
  { value: "cleaning", label: "Cleaning" },
  { value: "inspection", label: "Inspection" },
  { value: "other", label: "Other" },
];

const serviceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters"),
  description: z.string().trim().max(1000, "Description cannot exceed 1000 characters").optional(),
  price: z
    .number({ invalid_type_error: "Price must be a valid number" })
    .positive("Price must be greater than 0"),
  priceType: z.enum(["fixed", "hourly"]),
  durationMinutes: z
    .number({ invalid_type_error: "Duration must be a valid number" })
    .int("Duration must be a whole number of minutes")
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration cannot exceed 480 minutes (8 hours)"),
  serviceType: z.enum(["repair", "installation", "maintenance", "cleaning", "inspection", "other"]),
});

export default function ProviderServices() {
  const { providerStatus, loading: statusLoading } = useProviderStatus();
  const fileInputRef = useRef(null);

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deletingService, setDeletingService] = useState(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formPriceType, setFormPriceType] = useState("fixed");
  const [formDuration, setFormDuration] = useState("60");
  const [formServiceType, setFormServiceType] = useState("other");
  const [formImages, setFormImages] = useState([]);
  const [formIsActive, setFormIsActive] = useState(true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/provider/services");
      setServices(res.data.services || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (providerStatus === "approved") {
      fetchServices();
    }
  }, [providerStatus]);

  const openAddModal = () => {
    setFormTitle("");
    setFormDescription("");
    setFormPrice("");
    setFormPriceType("fixed");
    setFormDuration("60");
    setFormServiceType("other");
    setFormImages([]);
    setFormIsActive(true);
    setFormErrors({});
    setIsAddOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setFormTitle(service.title || "");
    setFormDescription(service.description || "");
    setFormPrice(String(service.price || ""));
    setFormPriceType(service.priceType || "fixed");
    setFormDuration(String(service.durationMinutes || "60"));
    setFormServiceType(service.serviceType || "other");
    setFormImages(Array.isArray(service.images) ? service.images : []);
    setFormIsActive(service.isActive ?? true);
    setFormErrors({});
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG and WEBP image formats are supported");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }
    if (formImages.length >= 5) {
      toast.error("You can upload a maximum of 5 images per service");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("photo", file);

      const res = await httpClient.post("/upload/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFormImages((prev) => [...prev, res.data.fileUrl]);
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormImages(formImages.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    const priceNum = Number(formPrice);
    const durationNum = Number(formDuration);

    const result = serviceSchema.safeParse({
      title: formTitle,
      description: formDescription,
      price: priceNum,
      priceType: formPriceType,
      durationMinutes: durationNum,
      serviceType: formServiceType,
    });

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setFormErrors(fieldErrors);
      return;
    }

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      price: priceNum,
      priceType: formPriceType,
      durationMinutes: durationNum,
      serviceType: formServiceType,
      images: formImages,
      isActive: formIsActive,
    };

    try {
      setSubmitting(true);
      if (editingService) {
        const res = await httpClient.put(`/provider/services/${editingService._id}`, payload);
        toast.success(res.data.message || "Service updated successfully");
        setEditingService(null);
      } else {
        const res = await httpClient.post("/provider/services", payload);
        toast.success(res.data.message || "Service created successfully");
        setIsAddOpen(false);
      }
      fetchServices();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (service) => {
    try {
      const updatedStatus = !service.isActive;
      await httpClient.put(`/provider/services/${service._id}`, {
        isActive: updatedStatus,
      });
      toast.success(`Service ${updatedStatus ? "activated" : "deactivated"}`);
      setServices((prev) =>
        prev.map((s) => (s._id === service._id ? { ...s, isActive: updatedStatus } : s))
      );
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingService) return;
    try {
      setDeleting(true);
      const res = await httpClient.delete(`/provider/services/${deletingService._id}`);
      toast.success(res.data.message || "Service deleted successfully");
      setDeletingService(null);
      fetchServices();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (!statusLoading && providerStatus !== "approved") {
    return (
      <ProviderLayout title="Services">
        <div className="flex flex-col items-center justify-center rounded-3xl bg-pastel-yellow p-12 text-center border border-amber-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink shadow-xs mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-extrabold text-ink">Approval Required</h3>
          <p className="mt-2 max-w-md text-sm text-slate-700 leading-relaxed">
            Your provider profile must be verified and approved by FixPoint administrators before you can create and publish services.
          </p>
          <div className="mt-6 flex gap-3">
            <Link to="/provider/verification" className="btn-dark">
              Check verification status
            </Link>
          </div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout title="Services">
      {/* Header bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Define your bookable services, prices in PKR, and estimated job durations.
          </p>
        </div>
        <button onClick={openAddModal} className="btn-dark self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Add service
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-3xl bg-white shadow-xs" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-12 text-center shadow-xs border border-black/5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pastel-peach text-ink mb-4">
            <Wrench className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-ink">No services created yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Add individual services with transparent prices to start receiving customer bookings.
          </p>
          <button onClick={openAddModal} className="btn-dark mt-6">
            <Plus className="h-4 w-4" /> Add first service
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <div
              key={s._id}
              className={`flex flex-col justify-between rounded-3xl bg-white p-6 shadow-xs border transition ${
                s.isActive ? "border-black/5 hover:border-black/15" : "border-slate-200 opacity-75"
              }`}
            >
              <div>
                {/* Images preview or fallback icon */}
                {s.images?.length > 0 ? (
                  <div className="mb-4 h-36 w-full overflow-hidden rounded-2xl bg-slate-100">
                    <img
                      src={s.images[0]}
                      alt={s.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-4 flex h-24 w-full items-center justify-center rounded-2xl bg-pastel-yellow/50 text-ink/30">
                    <Wrench className="h-10 w-10" />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="rounded-full bg-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {s.serviceType}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      s.isActive
                        ? "bg-pastel-mint text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <h4 className="text-base font-bold text-ink truncate" title={s.title}>
                  {s.title}
                </h4>

                <p className="mt-1 text-xs text-slate-500 line-clamp-2 min-h-8">
                  {s.description || "No description provided."}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                      Price ({s.priceType})
                    </span>
                    <span className="text-base font-extrabold text-ink font-mono">
                      Rs. {s.price}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block font-semibold">
                      Duration
                    </span>
                    <span className="flex items-center gap-1 font-bold text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {s.durationMinutes} mins
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleActive(s)}
                  title={s.isActive ? "Deactivate service" : "Activate service"}
                  className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 transition ${
                    s.isActive
                      ? "text-slate-500 hover:bg-soft"
                      : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>{s.isActive ? "Active" : "Disabled"}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(s)}
                    className="rounded-full p-2 text-slate-500 hover:bg-soft hover:text-ink transition"
                    title="Edit service"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeletingService(s)}
                    className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                    title="Delete service"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={isAddOpen || Boolean(editingService)}
        onClose={() => {
          setIsAddOpen(false);
          setEditingService(null);
        }}
        title={editingService ? "Edit service" : "Add service"}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Service Title *
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. AC Deep Cleaning & Gas Refill"
              className="input-field"
              autoFocus
            />
            {formErrors.title && (
              <p className="mt-1 text-xs text-red-500">{formErrors.title}</p>
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
              placeholder="What does this service include? Mention any parts or tools."
              className="input-field resize-none"
            />
            {formErrors.description && (
              <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Price (PKR) *
              </label>
              <input
                type="number"
                min="1"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="2500"
                className="input-field font-mono"
              />
              {formErrors.price && (
                <p className="mt-1 text-xs text-red-500">{formErrors.price}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Price Type
              </label>
              <select
                value={formPriceType}
                onChange={(e) => setFormPriceType(e.target.value)}
                className="input-field"
              >
                <option value="fixed">Fixed Price</option>
                <option value="hourly">Hourly Rate</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Estimated Duration (Minutes) *
              </label>
              <input
                type="number"
                min="15"
                max="480"
                step="15"
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                placeholder="60"
                className="input-field font-mono"
              />
              {formErrors.durationMinutes && (
                <p className="mt-1 text-xs text-red-500">{formErrors.durationMinutes}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Service Type
              </label>
              <select
                value={formServiceType}
                onChange={(e) => setFormServiceType(e.target.value)}
                className="input-field capitalize"
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Service Images */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Service Photos ({formImages.length}/5)
              </label>
              {formImages.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="text-xs font-bold text-ink underline"
                >
                  {uploadingImage ? "Uploading..." : "+ Upload image"}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />

            {formImages.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {formImages.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-black/10">
                    <img src={img} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No photos added yet.</p>
            )}
          </div>

          {/* Active status toggle */}
          <div className="flex items-center justify-between rounded-2xl bg-soft p-3.5">
            <div>
              <p className="text-xs font-bold text-ink">Active for booking</p>
              <p className="text-[11px] text-slate-500">
                Disable this to temporarily hide it from your public service catalog.
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
              onClick={() => {
                setIsAddOpen(false);
                setEditingService(null);
              }}
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
              {editingService ? "Update service" : "Create service"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingService)}
        onClose={() => setDeletingService(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete service?"
        message={`Are you sure you want to delete "${deletingService?.title}"? This cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={deleting}
      />
    </ProviderLayout>
  );
}
