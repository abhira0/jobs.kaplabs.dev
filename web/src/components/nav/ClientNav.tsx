"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { parseJwt } from "@/utils/jwt";

export default function ClientNav() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    const refreshFromStorage = () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
      if (token) {
        const payload = parseJwt(token);
        setUser(
          payload && typeof payload.sub === 'string'
            ? {
                username: payload.sub,
                role: (typeof payload.role === 'string' && (payload.role === 'user' || payload.role === 'admin')) ? payload.role : "user",
              }
            : null
        );
      } else {
        setUser(null);
      }
    };
    refreshFromStorage();
    // Also refresh when tab gains focus
    if (typeof window !== "undefined") {
      window.addEventListener("focus", refreshFromStorage);
      return () => window.removeEventListener("focus", refreshFromStorage);
    }
  }, [pathname]);

  // Close on click outside or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      const node = menuRef.current;
      if (!node) return;
      if (e.target && node.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer, { passive: true });
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("jwt_token");
        // expire the lightweight cookie used by middleware
        document.cookie = `logged_in=; Max-Age=0; path=/; SameSite=Lax`;
        // also clear jwt cookie mirrored for middleware protection
        document.cookie = `jwt_token=; Max-Age=0; path=/; SameSite=Lax`;
      }
      setUser(null);
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm relative">
      <Link className="px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors" href="/jobs">Jobs</Link>
      <Link className="px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors" href="/internships">Internships</Link>
      <Link className="px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors" href="/analytics">Analytics</Link>

      {user ? (
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors"
          >
            {user.username}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 min-w-[160px] rounded-md border border-default bg-black/70 backdrop-blur p-1">
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-1.5 rounded hover:bg-white/5">Profile</Link>
              {/* Admin visibility */}
              {user?.role === "admin" && (
                <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-3 py-1.5 rounded hover:bg-white/5">Admin</Link>
              )}
              <button onClick={() => { setMenuOpen(false); handleLogout(); }} disabled={loading} className="block w-full text-left px-3 py-1.5 rounded hover:bg-white/5">
                {loading ? "…" : "Logout"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link className="px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors" href="/login">Login</Link>
      )}
    </div>
  );
}


