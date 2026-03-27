import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function PageNotFound() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const pageName = location.pathname.replace(/^\//, "").split("/")[0] || "home";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <div className="text-8xl font-light text-gray-200 mb-4">404</div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">
          Page Not Found
        </h1>
        <p className="text-gray-500 mb-6">
          The page <strong>"{pageName}"</strong> could not be found in this
          application.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          🏠 Go Home
        </Link>
      </div>
    </div>
  );
}
