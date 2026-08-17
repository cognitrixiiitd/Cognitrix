import React from "react";

export default function PageSkeleton({ variant = "list" }) {
  if (variant === "list") {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Title skeleton */}
        <div className="h-8 w-48 bg-gray-200 rounded-lg mb-8" />

        {/* Tabs skeleton */}
        <div className="flex gap-2 p-1 bg-gray-100/80 rounded-xl w-fit">
          <div className="h-8 w-28 bg-gray-200 rounded-lg" />
          <div className="h-8 w-28 bg-gray-200 rounded-lg" />
          <div className="h-8 w-28 bg-gray-200 rounded-lg" />
        </div>

        {/* Grid of course cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              {/* Course Title skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-5/6 bg-gray-200 rounded" />
                <div className="h-3 w-1/3 bg-gray-100 rounded" />
              </div>

              {/* Progress skeleton */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between">
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                  <div className="h-3 w-10 bg-gray-100 rounded" />
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full" />
              </div>

              {/* Actions skeleton */}
              <div className="flex gap-2 pt-2">
                <div className="h-9 flex-1 bg-gray-200 rounded-lg" />
                <div className="h-9 w-9 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default fallback skeleton
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="h-32 w-full bg-gray-100 rounded-2xl border border-gray-100" />
      <div className="h-32 w-full bg-gray-100 rounded-2xl border border-gray-100" />
    </div>
  );
}
