import React from "react";

const Pulse = ({ className }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <Pulse className="h-32 w-full rounded-xl" />
      <Pulse className="h-4 w-3/4" />
      <Pulse className="h-3 w-1/2" />
      <div className="flex gap-2 pt-1">
        <Pulse className="h-5 w-16 rounded-full" />
        <Pulse className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
      <Pulse className="h-3 w-20" />
      <Pulse className="h-8 w-16" />
    </div>
  );
}

function ListItemSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-3">
      <Pulse className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-4 w-3/4" />
        <Pulse className="h-3 w-1/2" />
        <Pulse className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function PageSkeleton({ variant = "dashboard" }) {
  if (variant === "catalog") {
    return (
      <div>
        <div className="mb-8 space-y-2">
          <Pulse className="h-7 w-48" />
          <Pulse className="h-4 w-64" />
        </div>
        <div className="flex gap-3 mb-8">
          <Pulse className="h-10 flex-1 rounded-xl" />
          <Pulse className="h-10 w-48 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div>
        <div className="mb-8 space-y-2">
          <Pulse className="h-7 w-56" />
          <Pulse className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="max-w-4xl mx-auto">
        <Pulse className="h-4 w-32 mb-6" />
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <Pulse className="h-48 w-full" />
          <div className="p-6 space-y-3">
            <Pulse className="h-6 w-3/4" />
            <Pulse className="h-4 w-1/2" />
            <div className="flex gap-4 mt-4">
              <Pulse className="h-4 w-24" />
              <Pulse className="h-4 w-24" />
              <Pulse className="h-4 w-24" />
            </div>
            <Pulse className="h-10 w-40 mt-4 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div>
        <div className="mb-8 space-y-2">
          <Pulse className="h-7 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <ListItemSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (variant === "player") {
    return (
      <div className="-m-4 lg:-m-8">
        <div className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3">
          <Pulse className="w-6 h-6 rounded" />
          <div className="space-y-1 flex-1">
            <Pulse className="h-4 w-48" />
            <Pulse className="h-3 w-24" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 4rem - 3.5rem)" }}>
          <div className="flex-1 p-6">
            <Pulse className="w-full rounded-2xl" style={{ paddingBottom: "56.25%" }} />
            <div className="mt-4 space-y-2">
              <Pulse className="h-6 w-2/3" />
              <Pulse className="h-4 w-1/2" />
            </div>
          </div>
          <div className="w-full lg:w-80 border-l border-gray-100 bg-white p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Pulse className="w-7 h-7 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Pulse className="h-3 w-3/4" />
                  <Pulse className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="space-y-4 py-8">
      <Pulse className="h-8 w-3/4" />
      <Pulse className="h-4 w-1/2" />
      <Pulse className="h-4 w-2/3" />
    </div>
  );
}
