import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  FileCheck,
  FileText,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import { getErrorMessage, httpClient } from "../../lib/http";

export default function ProviderVerification() {
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/provider/profile");
      setProvider(res.data.provider);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const status = provider?.providerStatus || "invited";

  return (
    <ProviderLayout title="Verification Status">
      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl bg-white p-8 shadow-xs border border-black/5">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Header Banner */}
          {status === "pending_verification" && (
            <div className="rounded-3xl bg-pastel-blue p-8 border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-900 shadow-xs">
                  <Clock className="h-8 w-8" />
                </span>
                <div>
                  <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-900 mb-2">
                    Under Review
                  </span>
                  <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">
                    Your profile is being reviewed
                  </h2>
                  <p className="mt-1 text-sm text-blue-950 max-w-xl leading-relaxed">
                    Thank you for submitting your profile! Our admin team verifies each provider's CNIC and credentials to keep our platform trusted. You will receive an email once your profile is approved.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "approved" && (
            <div className="rounded-3xl bg-pastel-mint p-8 border border-emerald-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-5">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-800 shadow-xs">
                    <ShieldCheck className="h-8 w-8" />
                  </span>
                  <div>
                    <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-900 mb-2">
                      Verified & Approved
                    </span>
                    <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">
                      Congratulations! You are verified.
                    </h2>
                    <p className="mt-1 text-sm text-emerald-950 max-w-xl">
                      Your FixPoint provider profile is active. Add the services you offer and set your weekly schedule to start accepting customer bookings.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <Link to="/provider/services" className="btn-dark text-xs sm:text-sm">
                    <Wrench className="h-4 w-4" /> Manage services
                  </Link>
                  <Link
                    to="/provider/availability"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs sm:text-sm font-semibold text-ink shadow-xs hover:bg-ink hover:text-white transition"
                  >
                    <Calendar className="h-4 w-4" /> Set availability
                  </Link>
                </div>
              </div>
            </div>
          )}

          {status === "rejected" && (
            <div className="rounded-3xl bg-pastel-pink p-8 border border-rose-200">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                <div className="flex items-start gap-5">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-700 shadow-xs">
                    <ShieldAlert className="h-8 w-8" />
                  </span>
                  <div>
                    <span className="inline-block rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-900 mb-2">
                      Changes Required
                    </span>
                    <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">
                      Your profile was not approved
                    </h2>
                    <div className="mt-3 rounded-2xl bg-white/80 p-4 border border-rose-200 max-w-xl">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Reason from Admin
                      </p>
                      <p className="text-sm font-semibold text-rose-950">
                        {provider.rejectionReason || "Please review and complete your profile details and documents."}
                      </p>
                    </div>
                  </div>
                </div>

                <Link to="/provider/profile" className="btn-dark text-xs sm:text-sm shrink-0">
                  <Edit2 className="h-4 w-4" /> Edit & Resubmit
                </Link>
              </div>
            </div>
          )}

          {status === "invited" && (
            <div className="rounded-3xl bg-pastel-yellow p-8 border border-amber-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div>
                  <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink mb-2">
                    Action Required
                  </span>
                  <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">
                    Complete your profile to get verified
                  </h2>
                  <p className="mt-1 text-sm text-slate-700 max-w-xl">
                    You have been invited to FixPoint. Fill in your professional experience, service areas and upload your CNIC to start accepting jobs.
                  </p>
                </div>
                <Link to="/provider/profile" className="btn-dark text-xs sm:text-sm shrink-0">
                  Complete profile <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Submitted Profile Details (Read-only Summary) */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-ink">Submitted Profile Details</h3>
                <p className="text-xs text-slate-500">
                  Summary of your profile stored on the platform.
                </p>
              </div>
              {status !== "pending_verification" && (
                <Link
                  to="/provider/profile"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-ink underline"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit details
                </Link>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <div className="rounded-2xl bg-soft/50 p-4">
                <span className="text-slate-400 block mb-1">Full Name</span>
                <span className="font-bold text-ink text-sm">
                  {provider?.firstName} {provider?.lastName}
                </span>
              </div>

              <div className="rounded-2xl bg-soft/50 p-4">
                <span className="text-slate-400 block mb-1">Email</span>
                <span className="font-bold text-ink text-sm">{provider?.email}</span>
              </div>

              <div className="rounded-2xl bg-soft/50 p-4">
                <span className="text-slate-400 block mb-1">Phone Number</span>
                <span className="font-bold text-ink text-sm font-mono">
                  {provider?.phone || "Not provided"}
                </span>
              </div>

              <div className="rounded-2xl bg-soft/50 p-4">
                <span className="text-slate-400 block mb-1">Category</span>
                <span className="font-bold text-ink text-sm uppercase">
                  {provider?.serviceCategory || "—"}
                </span>
              </div>

              <div className="rounded-2xl bg-soft/50 p-4">
                <span className="text-slate-400 block mb-1">Experience</span>
                <span className="font-bold text-ink text-sm">
                  {provider?.experienceYears !== undefined ? `${provider.experienceYears} Years` : "—"}
                </span>
              </div>

              <div className="rounded-2xl bg-soft/50 p-4">
                <span className="text-slate-400 block mb-1">CNIC</span>
                <span className="font-bold text-ink text-sm font-mono">
                  {provider?.cnic || "Not provided"}
                </span>
              </div>
            </div>

            {/* Bio & Service Areas */}
            <div className="mt-4 rounded-2xl bg-soft/50 p-4">
              <span className="text-slate-400 block mb-1">Bio</span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {provider?.bio || <span className="italic text-slate-400">No bio submitted yet.</span>}
              </p>
            </div>

            {provider?.serviceAreas?.length > 0 && (
              <div className="mt-4 rounded-2xl bg-soft/50 p-4">
                <span className="text-slate-400 block mb-2">Service Areas</span>
                <div className="flex flex-wrap gap-1.5">
                  {provider.serviceAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-white px-2.5 py-1 text-xs text-slate-700 border border-black/5"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Documents preview count */}
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-soft/50 p-4">
              <div>
                <span className="text-slate-400 block text-xs">Attached Documents</span>
                <span className="font-bold text-ink text-xs">
                  {provider?.verificationDocs?.length || 0} document(s) uploaded
                </span>
              </div>
              <div className="flex items-center gap-2">
                {provider?.verificationDocs?.map((d, i) => (
                  <a
                    key={i}
                    href={typeof d === "string" ? d : d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-ink border border-black/5 hover:bg-ink hover:text-white transition"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>{typeof d === "object" ? d.docType : `Doc ${i + 1}`}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </ProviderLayout>
  );
}
