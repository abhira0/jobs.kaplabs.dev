"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildApiUrl } from "@/utils/api";
import { parseJwt } from "@/utils/jwt";

function LoginContent() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const search = useSearchParams();
  const redirectTo = search.get("redirect") || "/analytics";

  // Check if already logged in on mount - run only once to avoid redirect loops
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("jwt_token");
      const cookieToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('jwt_token='))
        ?.split('=')[1];
      const loggedInCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('logged_in='))
        ?.split('=')[1];

      if (token || cookieToken || loggedInCookie) {
        // Use the redirectTo value at mount time, not as a dependency
        const redirect = search.get("redirect") || "/analytics";
        router.replace(redirect);
      }
    }
    // Only run on mount, not when router or redirectTo changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(buildApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }).toString(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? json?.detail ?? "Login failed");
      const token = json?.access_token || json?.token || json?.jwt || json?.data?.access_token;
      if (!token) throw new Error("Login succeeded but no access token returned");
      if (typeof window !== "undefined") {
        localStorage.setItem("jwt_token", token);
        // Set a lightweight cookie so edge middleware can protect routes.
        // Align cookie lifetime with JWT expiry when available to avoid stale sessions.
        try {
          const payload = parseJwt(token);
          const nowSeconds = Math.floor(Date.now() / 1000);
          const maxAgeSeconds = payload && typeof payload.exp === 'number' ? Math.max(0, payload.exp - nowSeconds) : 30 * 24 * 60 * 60; // default 30d
          // Mirror JWT into a cookie so middleware can reliably protect routes
          document.cookie = `jwt_token=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; path=/; SameSite=Lax`;
          // Lightweight presence cookie (kept for backward-compat)
          document.cookie = `logged_in=1; Max-Age=${maxAgeSeconds}; path=/; SameSite=Lax`;
        } catch {
          const fallback = 30 * 24 * 60 * 60;
          document.cookie = `jwt_token=${encodeURIComponent(token)}; Max-Age=${fallback}; path=/; SameSite=Lax`;
          document.cookie = `logged_in=1; Max-Age=${fallback}; path=/; SameSite=Lax`;
        }
      }
      router.replace(redirectTo);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-default p-6 bg-black/40 backdrop-blur">
      <h1 className="text-xl font-semibold mb-4 text-center">Login</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="rounded-md border border-default bg-transparent px-3 py-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-md border border-default bg-transparent px-3 py-2 text-sm"
        />
        <button type="submit" disabled={loading} className="rounded-md bg-white/10 hover:bg-white/15 px-4 py-2 text-sm w-full">
          {loading ? "Logging in…" : "Login"}
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              setError(null);
              setDemoLoading(true);
              const demoUser = process.env.NEXT_PUBLIC_DEMO_USERNAME ?? "demo";
              const demoPass = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "demo";
              const res = await fetch(buildApiUrl("/auth/login"), {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ username: demoUser, password: demoPass }).toString(),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json?.error ?? json?.detail ?? "Demo login failed");
              const token = json?.access_token || json?.token || json?.jwt || json?.data?.access_token;
              if (!token) throw new Error("Demo login succeeded but no access token returned");
              if (typeof window !== "undefined") {
                localStorage.setItem("jwt_token", token);
                try {
                  const payload = parseJwt(token);
                  const nowSeconds = Math.floor(Date.now() / 1000);
                  const maxAgeSeconds = payload && typeof payload.exp === 'number' ? Math.max(0, payload.exp - nowSeconds) : 30 * 24 * 60 * 60;
                  document.cookie = `jwt_token=${encodeURIComponent(token)}; Max-Age=${maxAgeSeconds}; path=/; SameSite=Lax`;
                  document.cookie = `logged_in=1; Max-Age=${maxAgeSeconds}; path=/; SameSite=Lax`;
                } catch {
                  const fallback = 30 * 24 * 60 * 60;
                  document.cookie = `jwt_token=${encodeURIComponent(token)}; Max-Age=${fallback}; path=/; SameSite=Lax`;
                  document.cookie = `logged_in=1; Max-Age=${fallback}; path=/; SameSite=Lax`;
                }
              }
              router.replace(redirectTo);
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : "Demo login failed");
            } finally {
              setDemoLoading(false);
            }
          }}
          disabled={demoLoading}
          className="rounded-md border border-default px-4 py-2 text-sm w-full"
        >
          {demoLoading ? "Loading demo…" : "Demo?"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-8 p-6">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}


