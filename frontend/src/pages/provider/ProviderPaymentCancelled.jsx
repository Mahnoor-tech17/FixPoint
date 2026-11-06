import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight } from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";

export default function ProviderPaymentCancelled() {
  return (
    <ProviderLayout title="Payment Cancelled">
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xs border border-black/5 sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-ink">Payment Cancelled</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Your registration fee checkout was cancelled. No charges were made.
            Your profile will remain unlisted from search results until the one-time Rs 500 fee is completed.
          </p>
          <div className="pt-6 flex justify-center">
            <Link to="/provider/dashboard" className="btn-dark flex items-center gap-2">
              Back to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
}
