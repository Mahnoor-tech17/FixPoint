import React from "react";
import { Loader2 } from "lucide-react";

export default function Spinner({ size = "md", className = "" }) {
  const sizeMap = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
  };

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <Loader2 className={`${sizeMap[size] || sizeMap.md} animate-spin text-[#111111]`} />
    </div>
  );
}
