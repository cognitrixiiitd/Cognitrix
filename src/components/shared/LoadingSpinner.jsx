import React from "react";

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[#00a98d] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400 mt-4">{message}</p>
    </div>
  );
}
