import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Wrench, Search, Trash2, Power, CheckCircle, XCircle } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    httpClient
      .get("/admin/categories")
      .then((res) => {
        if (res.data?.success) setCategories(res.data.categories || []);
      })
      .catch((err) => console.error("Error loading categories:", err));
  }, []);

  const fetchServices = () => {
    setLoading(true);
    let query = `/admin/services?page=${page}&limit=10`;
    if (categoryFilter) query += `&category=${categoryFilter}`;
    if (activeFilter !== "") query += `&active=${activeFilter}`;
    if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;

    httpClient
      .get(query)
      .then((res) => {
        if (res.data?.success) {
          setServices(res.data.services || []);
          setPages(res.data.pages || 1);
        }
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, "Failed to load services"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchServices();
  }, [categoryFilter, activeFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchServices();
  };

  const handleToggleActive = async (service) => {
    try {
      const res = await httpClient.put(`/admin/services/${service._id}/toggle-active`);
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchServices();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to toggle service status"));
    }
  };

  const handleDeleteService = async () => {
    setDeleteLoading(true);
    try {
      const res = await httpClient.delete(`/admin/services/${deletingId}`);
      if (res.data?.success) {
        toast.success("Service removed successfully.");
        setDeletingId(null);
        fetchServices();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Cannot delete service. Active bookings exist."));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <AdminLayout title="Services Directory">
      <div className="space-y-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-bold rounded-2xl border border-gray-200 px-3 py-2.5 bg-white focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-bold rounded-2xl border border-gray-200 px-3 py-2.5 bg-white focus:outline-none"
            >
              <option value="">All Visibility</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 w-full md:w-80"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search service title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#111111]"
              />
            </div>
            <button type="submit" className="btn-dark text-xs px-4 py-2">
              Filter
            </button>
          </form>
        </div>

        {/* Services Table */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : services.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No services found"
            description="No provider services match your filter criteria."
          />
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Service Title</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Provider</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/60 transition">
                    <td className="py-4 font-bold text-ink">{s.title}</td>
                    <td className="py-4 text-gray-600 capitalize">
                      {s.categorySlug?.replace("-", " ")}
                    </td>
                    <td className="py-4 text-gray-700 font-medium">
                      {s.providerId?.firstName} {s.providerId?.lastName}
                    </td>
                    <td className="py-4 font-bold text-ink">PKR {s.price}</td>
                    <td className="py-4 text-gray-500">{s.durationMinutes} mins</td>
                    <td className="py-4">
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(s)}
                        className={`p-2 rounded-xl border text-xs font-bold transition ${
                          s.isActive
                            ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                        title={s.isActive ? "Deactivate" : "Activate"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingId(s._id)}
                        className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                        title="Delete Service"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination page={page} pages={pages} onPageChange={setPage} />
          </div>
        )}

        <ConfirmDialog
          isOpen={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          onConfirm={handleDeleteService}
          title="Delete Service"
          message="Are you sure you want to delete this service? It will only be removed if there are no pending or confirmed bookings associated with it."
          confirmText={deleteLoading ? "Deleting..." : "Delete Service"}
          variant="danger"
        />
      </div>
    </AdminLayout>
  );
}
