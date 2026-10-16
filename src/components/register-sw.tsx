"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function RegisterSW() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // After logging out, drop the cached pages so they are not readable offline.
  useEffect(() => {
    if ((pathname !== "/login" && pathname !== "/cadastro") || !("caches" in window)) return;
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("gid-pages")).map((k) => caches.delete(k))))
      .catch(() => {});
  }, [pathname]);

  return null;
}
