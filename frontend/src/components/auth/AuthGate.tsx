"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { parseJwt } from "@/utils/jwt";

type Props = { children: React.ReactNode };

export default function AuthGate({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    // Public paths
    if (
      pathname === "/login" ||
      pathname.startsWith("/invite/") ||
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon") ||
      pathname.startsWith("/public/") ||
      pathname.startsWith("/api/")
    ) {
      setAllowed(true);
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
    if (!token) {
      // Ensure server-side gate also blocks on subsequent navigations
      if (typeof document !== "undefined") {
        document.cookie = `jwt_token=; Max-Age=0; path=/; SameSite=Lax`;
        document.cookie = `logged_in=; Max-Age=0; path=/; SameSite=Lax`;
      }
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    const payload = parseJwt(token);
    if (!payload || (typeof payload.exp === 'number' && Date.now() / 1000 >= payload.exp)) {
      // Token invalid or expired
      try { localStorage.removeItem("jwt_token"); } catch {}
      if (typeof document !== "undefined") {
        document.cookie = `jwt_token=; Max-Age=0; path=/; SameSite=Lax`;
        document.cookie = `logged_in=; Max-Age=0; path=/; SameSite=Lax`;
      }
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setAllowed(true);
  }, [pathname, router]);

  if (!allowed) return null;
  return <>{children}</>;
}


