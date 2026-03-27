import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { pagesConfig } from "@/pages.config";

export default function NavigationTracker() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { Pages, mainPage } = pagesConfig;
  const mainPageKey = mainPage ?? Object.keys(Pages)[0];

  useEffect(() => {
    const pathname = location.pathname;
    let pageName;

    if (pathname === "/" || pathname === "") {
      pageName = mainPageKey;
    } else {
      const pathSegment = pathname.replace(/^\//, "").split("/")[0];
      const pageKeys = Object.keys(Pages);
      const matchedKey = pageKeys.find(
        (key) => key.toLowerCase() === pathSegment.toLowerCase(),
      );
      pageName = matchedKey || null;
    }

    if (isAuthenticated && pageName && user) {
      supabase
        .from("analytics_events")
        .insert({
          user_id: user.id,
          event_type: "play",
          meta: { page: pageName },
        })
        .then(() => {})
        .catch(() => {});
    }
  }, [location, isAuthenticated, Pages, mainPageKey, user]);

  return null;
}
