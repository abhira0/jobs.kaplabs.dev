"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@/types/user";
import { parseJwt } from "@/utils/jwt";
import { buildApiUrl } from "@/utils/api";

export default function ProfilePage() {
  const [user, setUser] = useState<Pick<User, "_id" | "username" | "email" | "name" | "role"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRules, setFilterRules] = useState<unknown[]>([]);
  const [sortRules, setSortRules] = useState<unknown[]>([]);
  const [cookie, setCookie] = useState("");
  const [savingCookie, setSavingCookie] = useState(false);
  const [loadingCookie, setLoadingCookie] = useState(false);
  const [rulesMsg, setRulesMsg] = useState<string | null>(null);
  const [refreshingSimplify, setRefreshingSimplify] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const rulesMsgTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("jwt_token");
        if (!token) {
          setUser(null);
          return;
        }
        const payload = parseJwt(token);
        if (payload) {
          setUser({
            _id: "",
            username: typeof payload.sub === 'string' ? payload.sub : '',
            email: typeof payload.email === 'string' ? payload.email : '',
            name: typeof payload.name === 'string' ? payload.name : '',
            role: (typeof payload.role === 'string' && (payload.role === 'user' || payload.role === 'admin')) ? payload.role : 'user'
          });
        } else {
          setUser(null);
        }

        // Fetch saved rules and cookie
        if (token) {
          try {
            const meRes = await fetch(buildApiUrl("/auth/me"), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            const me = await meRes.json();
            if (Array.isArray(me?.filter_rules)) setFilterRules(me.filter_rules);
            if (Array.isArray(me?.sort_rules)) setSortRules(me.sort_rules);
          } catch {}

          try {
            setLoadingCookie(true);
            const r = await fetch(buildApiUrl("/simplify/cookie"), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            if (r.ok) {
              const j = await r.json();
              setCookie(j.cookie || "");
            }
          } catch {}
          finally {
            setLoadingCookie(false);
          }
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    run();

    // Cleanup timeout on unmount
    return () => {
      if (rulesMsgTimeoutRef.current) {
        clearTimeout(rulesMsgTimeoutRef.current);
      }
    };
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  if (!user) {
    return <p className="text-sm">You are not logged in.</p>;
  }

  return (
    <section className="max-w-2xl flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Profile</h1>
      <div className="rounded-md border border-default p-4">
        <div className="text-sm"><span className="text-muted">Username:</span> {user.username}</div>
        <div className="text-sm"><span className="text-muted">Email:</span> {user.email}</div>
        <div className="text-sm"><span className="text-muted">Name:</span> {user.name ?? "—"}</div>
        <div className="text-sm"><span className="text-muted">Role:</span> {user.role}</div>
      </div>

      <div className="rounded-md border border-default p-4 space-y-3">
        <h2 className="text-sm font-semibold">Saved Filters</h2>
        <p className="text-sm text-muted">
          {filterRules.length === 0 ? "No saved filters." : `${filterRules.length} filter${filterRules.length === 1 ? '' : 's'} saved.`}
        </p>
        <button
          className="rounded-md border border-default px-3 py-1.5 text-xs hover:bg-white/5"
          onClick={async () => {
            try {
              const token = localStorage.getItem("jwt_token");
              if (!token) return;
              const res = await fetch(buildApiUrl("/auth/me/rules"), {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ filter_rules: true }),
              });
              if (!res.ok) throw new Error("Failed to delete filters");
              setFilterRules([]);
              setRulesMsg("Deleted saved filters.");
              if (rulesMsgTimeoutRef.current) clearTimeout(rulesMsgTimeoutRef.current);
              rulesMsgTimeoutRef.current = setTimeout(() => setRulesMsg(null), 2000);
            } catch (e: unknown) {
              setRulesMsg(e instanceof Error ? e.message : "Failed to delete filters");
            }
          }}
        >Delete Saved Filters</button>
      </div>

      <div className="rounded-md border border-default p-4 space-y-3">
        <h2 className="text-sm font-semibold">Saved Sorts</h2>
        <p className="text-sm text-muted">
          {sortRules.length === 0 ? "No saved sorts." : `${sortRules.length} sort${sortRules.length === 1 ? '' : 's'} saved.`}
        </p>
        <button
          className="rounded-md border border-default px-3 py-1.5 text-xs hover:bg-white/5"
          onClick={async () => {
            try {
              const token = localStorage.getItem("jwt_token");
              if (!token) return;
              const res = await fetch(buildApiUrl("/auth/me/rules"), {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ sort_rules: true }),
              });
              if (!res.ok) throw new Error("Failed to delete sorts");
              setSortRules([]);
              setRulesMsg("Deleted saved sorts.");
              if (rulesMsgTimeoutRef.current) clearTimeout(rulesMsgTimeoutRef.current);
              rulesMsgTimeoutRef.current = setTimeout(() => setRulesMsg(null), 2000);
            } catch (e: unknown) {
              setRulesMsg(e instanceof Error ? e.message : "Failed to delete sorts");
            }
          }}
        >Delete Saved Sorts</button>
        {rulesMsg && <p className="text-xs text-muted">{rulesMsg}</p>}
      </div>

      <div className="rounded-md border border-default p-4 space-y-2">
        <h2 className="text-sm font-semibold">Simplify Cookie</h2>
        {loadingCookie ? (
          <p className="text-sm text-muted">Loading cookie…</p>
        ) : (
          <textarea
            className="w-full min-h-[140px] rounded-md border border-default bg-transparent px-3 py-2 text-xs"
            value={cookie}
            onChange={(e) => setCookie(e.target.value)}
            placeholder="Paste your simplify cookie here"
          />
        )}
        <div>
          <button
            disabled={savingCookie}
            onClick={async () => {
              try {
                setSavingCookie(true);
                const token = localStorage.getItem("jwt_token");
                if (!token) throw new Error("Not logged in");
                const res = await fetch(buildApiUrl("/simplify/cookie"), {
                  method: "PUT",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ cookie }),
                });
                if (!res.ok) throw new Error("Failed to update cookie");
              } catch (e) {
                console.error(e);
              } finally {
                setSavingCookie(false);
              }
            }}
            className="rounded-md bg-white/10 hover:bg-white/15 px-4 py-2 text-sm"
          >
            {savingCookie ? "Saving…" : "Save Cookie"}
          </button>
          <button
            disabled={refreshingSimplify}
            onClick={async () => {
              try {
                setRefreshingSimplify(true);
                setRefreshMsg(null);
                const token = localStorage.getItem("jwt_token");
                if (!token) throw new Error("Not logged in");
                const res = await fetch(buildApiUrl("/simplify/refresh"), {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(j?.detail || j?.error || "Failed to refresh data");
                setRefreshMsg(`Refreshed ${j?.items_count ?? ''}`.trim());
              } catch (e: unknown) {
                setRefreshMsg(e instanceof Error ? e.message : "Failed to refresh");
              } finally {
                setRefreshingSimplify(false);
              }
            }}
            className="ml-2 rounded-md border border-default px-4 py-2 text-sm hover:bg-white/5"
          >
            {refreshingSimplify ? "Refreshing…" : "Refresh Simplify Data"}
          </button>
          {refreshMsg && <p className="mt-2 text-xs text-muted">{refreshMsg}</p>}
        </div>
      </div>
    </section>
  );
}



