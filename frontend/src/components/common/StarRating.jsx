import React from "react";
import { Star } from "lucide-react";

export default function StarRating({
  rating = 0,
  max = 5,
  interactive = false,
  onChange = null,
  size = "md",
  showValue = false,
  reviewCount = null,
  className = "",
}) {
  const sizeMap = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  };

  const starSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => {
          const starValue = i + 1;
          const isFilled = rating >= starValue;
          const isHalf = !isFilled && rating >= starValue - 0.5;

          return (
            <button
              type="button"
              key={i}
              disabled={!interactive}
              onClick={() => interactive && onChange && onChange(starValue)}
              className={`${
                interactive ? "cursor-pointer transition-transform hover:scale-110" : "cursor-default"
              } focus:outline-none`}
            >
              <Star
                className={`${starSize} ${
                  isFilled
                    ? "text-amber-400 fill-amber-400"
                    : isHalf
                    ? "text-amber-400 fill-amber-200"
                    : "text-gray-200 fill-gray-100"
                }`}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-xs font-bold text-ink ml-1">
          {Number(rating).toFixed(1)}
        </span>
      )}
      {reviewCount !== null && (
        <span className="text-xs text-gray-500 font-medium">({reviewCount})</span>
      )}
    </div>
  );
}
