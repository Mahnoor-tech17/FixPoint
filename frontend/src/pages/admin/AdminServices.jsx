import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Edit2, Plus, Power, Trash2 } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import { getErrorMessage, httpClient } from "../../lib/http";

const emptyForm = { title: "", categorySlug: "", description: "", defaultDurationMinutes: 60, suggestedPrice: 1000 };

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadServices = useCallback(async () => {
    try {
      const [serviceResponse, categoryResponse] = await Promise.all([
        httpClient.get("/admin/master-services?limit=100"),
        httpClient.get("/admin/categories"),
      ]);
      setServices(serviceResponse.data.services || []);
      setCategories(categoryResponse.data.categories || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(loadServices); }, [loadServices]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (service) => {
    setEditing(service);
    setFormOpen(true);
    setForm({ title: service.title, categorySlug: service.categorySlug, description: service.description || "", defaultDurationMinutes: service.defaultDurationMinutes, suggestedPrice: service.suggestedPrice });
  };

  const saveService = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      if (editing) await httpClient.put(`/admin/master-services/${editing._id}`, form);
      else await httpClient.post("/admin/master-services", form);
      toast.success(editing ? "Master service updated" : "Master service created");
      setEditing(null);
      setFormOpen(false);
      await loadServices();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service) => {
    try {
      await httpClient.put(`/admin/master-services/${service._id}`, { isActive: !service.isActive });
      await loadServices();
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const deleteService = async () => {
    if (!deleting) return;
    try {
      await httpClient.delete(`/admin/master-services/${deleting._id}`);
      toast.success("Master service deleted");
      setDeleting(null);
      await loadServices();
    } catch (error) {
      const message = getErrorMessage(error);
      if (error.response?.data?.deactivated) {
        toast.info(error.response.data.message);
        setDeleting(null);
        await loadServices();
      } else toast.error(message);
    }
  };

  return (
    <AdminLayout title="Master Services">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">Manage the service catalog providers use to set their own prices.</p>
        <button type="button" onClick={openCreate} className="btn-dark self-start sm:self-auto"><Plus className="h-4 w-4" /> Add master service</button>
      </div>
      {loading ? <Spinner /> : services.length === 0 ? (
        <EmptyState title="No master services" description="Add services to make them available to providers." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <article key={service._id} className="rounded-3xl border border-black/5 bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-bold text-ink">{service.title}</h2>
                  <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{service.categorySlug.replaceAll("-", " ")}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${service.isActive ? "bg-pastel-mint text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{service.isActive ? "Active" : "Inactive"}</span>
              </div>
              <p className="mt-3 min-h-10 text-sm text-slate-600">{service.description || "No description"}</p>
              <div className="mt-4 flex justify-between border-t border-black/5 pt-3 text-xs text-slate-600">
                <span>{service.defaultDurationMinutes} min default</span><span>Suggested PKR {service.suggestedPrice}</span>
              </div>
              <div className="mt-4 flex justify-end gap-1 border-t border-black/5 pt-3">
                <button type="button" onClick={() => toggleActive(service)} title={service.isActive ? "Deactivate" : "Activate"} className="rounded-full p-2 text-slate-500 hover:bg-soft"><Power className="h-4 w-4" /></button>
                <button type="button" onClick={() => openEdit(service)} title="Edit" className="rounded-full p-2 text-slate-500 hover:bg-soft"><Edit2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => setDeleting(service)} title="Delete" className="rounded-full p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal isOpen={formOpen} onClose={() => { setEditing(null); setFormOpen(false); setForm(emptyForm); }} title={editing ? "Edit master service" : "Add master service"}>
        <form onSubmit={saveService} className="space-y-4">
          <label className="block text-xs font-bold text-slate-600">Title<input required maxLength={100} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="input-field mt-1" /></label>
          <label className="block text-xs font-bold text-slate-600">Category<select required value={form.categorySlug} onChange={(event) => setForm({ ...form, categorySlug: event.target.value })} className="input-field mt-1"><option value="">Choose category</option>{categories.map((category) => <option key={category._id || category.slug} value={category.slug}>{category.name}</option>)}</select></label>
          <label className="block text-xs font-bold text-slate-600">Description<textarea maxLength={1000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="input-field mt-1 resize-none" /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-600">Default duration (minutes)<input type="number" min="15" max="480" required value={form.defaultDurationMinutes} onChange={(event) => setForm({ ...form, defaultDurationMinutes: Number(event.target.value) })} className="input-field mt-1" /></label>
            <label className="block text-xs font-bold text-slate-600">Suggested price (PKR)<input type="number" min="0" required value={form.suggestedPrice} onChange={(event) => setForm({ ...form, suggestedPrice: Number(event.target.value) })} className="input-field mt-1" /></label>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setEditing(null); setFormOpen(false); setForm(emptyForm); }} className="btn-light">Cancel</button><button type="submit" disabled={saving} className="btn-dark">{saving ? "Saving..." : "Save service"}</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={deleteService} title="Delete master service?" message={`Delete "${deleting?.title}"? If providers already use it, it will be deactivated instead.`} confirmText="Delete" confirmVariant="danger" />
    </AdminLayout>
  );
}
