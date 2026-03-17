import React from "react";
import { Button } from "@/components/ui/button";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-5">
          <Icon className="w-7 h-7 text-gray-300" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-black mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="mt-6 bg-[#00a98d] hover:bg-[#008f77] text-white rounded-xl px-6"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
