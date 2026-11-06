import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page = 1, pages = 1, onPageChange, className = "" }) {
  if (pages <= 1) return null;

  return (
    <div className={`flex items-center justify-between gap-4 py-4 ${className}`}>
      <span className="text-xs text-gray-500 font-medium">
        Page <span className="font-bold text-ink">{page}</span> of{" "}
        <span className="font-bold text-ink">{pages}</span>
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4 text-ink" />
        </button>

        <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-ink">
          {page}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4 text-ink" />
        </button>
      </div>
    </div>
  );
}
