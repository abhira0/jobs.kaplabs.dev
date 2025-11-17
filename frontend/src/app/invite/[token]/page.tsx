"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { buildApiUrl } from "@/utils/api";

type InviteResp = {
  valid: boolean;
  invite?: { email: string; token: string; expires_at: string | Date; is_used: boolean };
  isExpired?: boolean;
  isUsed?: boolean;
};

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InviteResp | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const isUsernameValid = username.trim().length > 0;
  const isPasswordValid = password.length >= 6;
  const submitDisabled = !isUsernameValid || !isPasswordValid || accepting;

  useEffect(() => {
    if (!token) {
      setError("Missing invite token");
      setLoading(false);
      return;
    }
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(buildApiUrl(`/invites/${token}`), { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Invalid or expired invite");
        setData(json);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load invite");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      if (!token) throw new Error("Missing invite token");
      // Basic client-side validation to avoid server 422s
      if (!username || username.trim().length === 0) {
        setFormError("Please choose a username");
        setAccepting(false);
        return;
      }
      if (!password || password.length < 6) {
        setFormError("Password must be at least 6 characters");
        setAccepting(false);
        return;
      }
      setFormError(null);
      const res = await fetch(buildApiUrl(`/invites/redeem`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username, password })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.detail ?? json?.error ?? "Unable to redeem invite");
      router.replace("/login");
    } catch (e: unknown) {
      // Prefer inline form error for validation issues
      const msg = e instanceof Error ? e.message : "Unable to redeem invite";
      if (msg.toLowerCase().includes("password")) {
        setFormError(msg);
      } else {
        setError(msg);
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <p className="text-sm text-muted">Validating invite…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) return null;

  const { valid, invite, isExpired, isUsed } = data;
  const email = invite?.email ?? "";

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="flex flex-col gap-4 w-full max-w-lg">
      <h1 className="text-xl font-semibold">Accept Invite</h1>
      {valid ? (
        <>
          <p className="text-sm text-muted">You have been invited to join with email:</p>
          <p className="text-sm font-medium">{email}</p>
            <div className="grid grid-cols-1 gap-3 mt-2">
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); if (formError) setFormError(null); }}
                placeholder="Choose a username"
                className={`rounded-md border bg-transparent px-3 py-2 text-sm ${!isUsernameValid && username ? 'border-red-500' : 'border-default'}`}
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (formError) setFormError(null); }}
                placeholder="Choose a password (min 6 chars)"
                className={`rounded-md border bg-transparent px-3 py-2 text-sm ${password && !isPasswordValid ? 'border-red-500' : 'border-default'}`}
                required
                minLength={6}
              />
              {password && !isPasswordValid && (
                <p className="text-xs text-red-400">Password must be at least 6 characters</p>
              )}
              {formError && <p className="text-xs text-red-400">{formError}</p>}
            </div>
          <button
            onClick={handleAccept}
              disabled={submitDisabled}
              title={submitDisabled ? (!isUsernameValid ? 'Enter a username' : !isPasswordValid ? 'Password must be at least 6 characters' : '') : ''}
            className="rounded-md bg-white/10 hover:bg-white/15 px-4 py-2 text-sm w-fit"
          >
            {accepting ? "Accepting…" : "Accept Invite"}
          </button>
        </>
      ) : (
        <div className="text-sm">
          {isUsed ? <p>This invite has already been used.</p> : null}
          {isExpired ? <p>This invite has expired.</p> : null}
          {!isUsed && !isExpired ? <p>Invite is invalid.</p> : null}
        </div>
      )}
      </div>
    </section>
  );
}


