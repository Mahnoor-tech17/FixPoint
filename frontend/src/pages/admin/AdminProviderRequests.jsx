import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Briefcase,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  User,
  XCircle,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { getErrorMessage, httpClient } from "../../lib/http";

export default function AdminProviderRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Action states
  const [approvingProvider, setApprovingProvider] = useState(null);
  const [approving, setApproving] = useState(false);

  const [rejectingProvider, setRejectingProvider] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/admin/provider-requests");
      setRequests(res.data.requests || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproveConfirm = async () => {
    if (!approvingProvider) return;
    try {
      setApproving(true);
      const res = await httpClient.put(`/admin/providers/${approvingProvider._id}/status`, {
        status: "approved",
      });
      toast.success(res.data.message || "Provider approved successfully!");
      setApprovingProvider(null);
      fetchRequests();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setApproving(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectingProvider) return;

    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setRejectReasonError("Please provide a reason of at least 5 characters.");
      return;
    }

    try {
      setRejecting(true);
      const res = await httpClient.put(`/admin/providers/${rejectingProvider._id}/status`, {
        status: "rejected",
        reason: rejectReason.trim(),
      });
      toast.success(res.data.message || "Provider request rejected");
      setRejectingProvider(null);
      setRejectReason("");
      setRejectReasonError("");
      fetchRequests();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRejecting(false);
    }
  };

  const openRejectModal = (provider) => {
    setRejectingProvider(provider);
    setRejectReason("");
    setRejectReasonError("");
  };

  return (
    <AdminLayout title="Provider Requests">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Review and verify submitted provider profiles before they go live on FixPoint.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pastel-blue px-3.5 py-1.5 text-xs font-bold text-blue-900">
            <Clock className="h-3.5 w-3.5" />
            {requests.length} Pending
          </span>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-3xl bg-white p-6 shadow-xs" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-14 text-center shadow-xs border border-black/5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pastel-mint text-emerald-800">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-ink">All caught up!</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            There are no pending provider verification requests at the moment.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {requests.map((p) => {
            const hasCnic = Boolean(p.cnic);
            const hasDocs = Array.isArray(p.verificationDocs) && p.verificationDocs.length > 0;
            const hasBio = Boolean(p.bio && p.bio.length >= 10);
            const hasAreas = Array.isArray(p.serviceAreas) && p.serviceAreas.length > 0;
            const hasExp = p.experienceYears !== undefined && p.experienceYears !== null;

            return (
              <div
                key={p._id}
                className="flex flex-col justify-between rounded-3xl bg-white p-6 shadow-xs border border-black/5 hover:border-black/10 transition sm:p-7"
              >
                <div>
                  {/* Top info */}
                  <div className="flex items-start gap-4">
                    {p.profilePhoto ? (
                      <img
                        src={p.profilePhoto}
                        alt=""
                        className="h-16 w-16 rounded-2xl object-cover border border-black/10 shrink-0"
                      />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-pastel-yellow text-lg font-bold text-ink">
                        {p.firstName?.[0]}
                        {p.lastName?.[0]}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold text-ink truncate">
                          {p.firstName} {p.lastName}
                        </h3>
                        <span className="rounded-full bg-soft px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-ink">
                          {p.serviceCategory}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-xs text-slate-500">
                        <p className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {p.email}
                        </p>
                        {p.phone && (
                          <p className="flex items-center gap-1.5 font-mono">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {p.phone}
                          </p>
                        )}
                        {(p.city || p.address) && (
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            {[p.address, p.city].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bio and Experience */}
                  <div className="mt-5 rounded-2xl bg-soft/60 p-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                      <span>BIO & BACKGROUND</span>
                      <div className="flex items-center gap-3 font-normal">
                        {p.hourlyRate ? (
                          <span className="rounded-full bg-pastel-mint border border-emerald-200 px-2 py-0.5 text-[11px] text-emerald-900">
                            PKR {p.hourlyRate}/hr
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] text-slate-400">
                            Rate not set
                          </span>
                        )}
                        <span className="font-bold">{p.experienceYears ?? 0} yrs exp</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {p.bio || <span className="italic text-slate-400">No bio provided</span>}
                    </p>

                    {/* Service Areas */}
                    {hasAreas && (
                      <div className="mt-3 pt-3 border-t border-black/5">
                        <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">
                          Service Areas
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {p.serviceAreas.map((area, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg bg-white px-2 py-0.5 text-xs text-slate-700 border border-black/5"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CNIC Number */}
                    {hasCnic && (
                      <div className="mt-3 text-xs text-slate-600">
                        <b>CNIC:</b> <span className="font-mono">{p.cnic}</span>
                      </div>
                    )}
                  </div>

                  {/* Verification Checklist */}
                  <div className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Verification Checklist
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                            hasCnic ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        <span className={hasCnic ? "text-ink font-medium" : "text-slate-400"}>
                          CNIC number provided {p.cnic ? `(${p.cnic})` : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                            hasDocs ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        <span className={hasDocs ? "text-ink font-medium" : "text-slate-400"}>
                          Verification documents uploaded ({p.verificationDocs?.length || 0})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                            hasBio && hasExp ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        <span
                          className={hasBio && hasExp ? "text-ink font-medium" : "text-slate-400"}
                        >
                          Bio and experience details complete
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-white ${
                            hasAreas ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        <span className={hasAreas ? "text-ink font-medium" : "text-slate-400"}>
                          Service areas covered
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documents list */}
                  <div className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Attached Documents
                    </p>
                    {!hasDocs ? (
                      <p className="text-xs italic text-slate-400">No documents attached.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {p.verificationDocs.map((doc, idx) => {
                          const docUrl = typeof doc === "string" ? doc : doc?.url;
                          const docType = typeof doc === "object" ? doc?.docType : "document";
                          const docName = typeof doc === "object" ? doc?.name : `Document #${idx + 1}`;

                          return (
                            <a
                              key={idx}
                              href={docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-2 rounded-2xl border border-black/10 bg-soft/40 p-3 text-xs text-ink transition hover:bg-white hover:shadow-xs group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="truncate">
                                  <p className="font-bold truncate">{docName || docType}</p>
                                  <p className="text-[10px] uppercase text-slate-400 font-semibold">
                                    {docType}
                                  </p>
                                </div>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-ink shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-5 border-t border-black/5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
                  <button
                    onClick={() => openRejectModal(p)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition w-full sm:w-auto"
                  >
                    <XCircle className="h-4 w-4" /> Reject request
                  </button>
                  <button
                    onClick={() => setApprovingProvider(p)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-bold text-white bg-ink hover:bg-black/80 transition w-full sm:w-auto shadow-xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Approve provider
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(approvingProvider)}
        onClose={() => setApprovingProvider(null)}
        onConfirm={handleApproveConfirm}
        title="Approve provider?"
        message={`Are you sure you want to approve ${approvingProvider?.firstName} ${approvingProvider?.lastName}? An email will be sent to them and their account will immediately be able to create services and set availability.`}
        confirmText="Yes, approve"
        confirmVariant="primary"
        isLoading={approving}
      />

      {/* Reject Modal */}
      <Modal
        isOpen={Boolean(rejectingProvider)}
        onClose={() => setRejectingProvider(null)}
        title="Reject provider verification"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div className="rounded-2xl bg-pastel-pink/70 p-4 text-xs text-rose-900 leading-relaxed">
            Please explain why this profile was not approved. The provider will receive this explanation via email and can update their profile to submit again.
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Rejection Reason *
            </label>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectReasonError) setRejectReasonError("");
              }}
              placeholder="e.g. CNIC photo is blurry and illegible. Please upload a clear scan of both sides."
              className="input-field resize-none"
              autoFocus
            />
            {rejectReasonError && (
              <p className="mt-1 text-xs text-red-500">{rejectReasonError}</p>
            )}
          </div>

          <div className="pt-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectingProvider(null)}
              className="btn-light w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rejecting}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition w-full sm:w-auto disabled:opacity-60"
            >
              {rejecting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send rejection
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
