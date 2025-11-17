"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildApiUrl } from "@/utils/api";
import { parseJwt } from "@/utils/jwt";

type User = {
  _id?: string;
  username: string;
  email?: string;
  role?: string;
  created_at?: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ role?: string } | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
    if (token) {
      const payload = parseJwt(token);
      setMe(payload ?? null);
    } else {
      setMe(null);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const params = new URLSearchParams({ page: String(page), size: String(size) });
      const res = await fetch(buildApiUrl(`/auth/users?${params.toString()}`), { cache: "no-store", headers });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotalPages(data.total_pages ?? 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Users</h1>
      {me && me.role !== "admin" ? (
        <div className="text-sm">
          <p>You do not have access to this page. <Link href="/login" className="underline">Login</Link> with an admin account.</p>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted">No users.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b border-default">
                  <th className="py-2 pr-3">Username</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id || u.username} className="border-b border-default/60">
                    <td className="py-2 pr-3">{u.username}</td>
                    <td className="py-2 pr-3">{u.email || "—"}</td>
                    <td className="py-2 pr-3">{u.role || "user"}</td>
                    <td className="py-2 pr-3">{u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-muted">Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border border-default px-2 py-1 text-xs hover:bg-white/5 disabled:opacity-50">Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-md border border-default px-2 py-1 text-xs hover:bg-white/5 disabled:opacity-50">Next</button>
              <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="ml-2 rounded-md border border-default bg-transparent px-2 py-1 text-xs">
                {[10,25,50,100,200].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}



