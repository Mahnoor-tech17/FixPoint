import Modal from "./Modal";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  confirmVariant = "danger", // danger | primary
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose} title={title} maxWidth="max-w-md">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            confirmVariant === "danger" ? "bg-pastel-pink text-red-600" : "bg-pastel-blue text-ink"
          }`}
        >
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="text-sm text-slate-600 leading-relaxed pt-1">
          {message}
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="btn-light w-full sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 w-full sm:w-auto ${
            confirmVariant === "danger"
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-ink text-white hover:bg-black/80"
          }`}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
