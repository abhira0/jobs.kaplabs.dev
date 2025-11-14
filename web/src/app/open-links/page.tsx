"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

function OpenLinksContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState<string | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const links = useMemo<string[]>(() => {
    try {
      const raw = params.get("urls");
      if (!raw) return [];
      const json = decodeURIComponent(atob(decodeURIComponent(raw)));
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) return [];
      // Deduplicate and filter
      const set = new Set<string>();
      for (const u of arr) {
        if (typeof u === "string" && u.startsWith("http")) set.add(u);
      }
      return Array.from(set);
    } catch {
      return [];
    }
  }, [params]);

  const handleOpenAll = () => {
    let blocked = 0;
    links.forEach((url) => {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) blocked += 1;
    });
    if (blocked > 0) {
      setStatus(`Your browser blocked ${blocked} tab(s). Please allow pop-ups and try again.`);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setStatus(null), 5000);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(links.join("\n"));
      setStatus("Copied all links to clipboard");
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setStatus(null), 2000);
    } catch {
      setStatus("Failed to copy");
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setStatus(null), 2000);
    }
  };

  return (
    <section className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-lg font-semibold">Open Links</h1>
      {links.length === 0 ? (
        <p className="text-sm text-muted">No links provided.</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAll}
              className="rounded-md bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm text-white"
            >
              Open All ({links.length})
            </button>
            <button
              onClick={handleCopy}
              className="rounded-md border border-default hover:bg-white/5 px-3 py-1.5 text-sm"
            >
              Copy All
            </button>
            {status && <span className="text-xs text-yellow-400 ml-2" aria-live="polite">{status}</span>}
          </div>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {links.map((u) => (
              <li key={u}>
                <a href={u} target="_blank" rel="noreferrer" className="underline break-all">{u}</a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default function OpenLinksPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto p-6">Loading...</div>}>
      <OpenLinksContent />
    </Suspense>
  );
}



