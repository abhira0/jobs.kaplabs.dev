"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildApiUrl } from "@/utils/api";
import { parseJwt } from "@/utils/jwt";
import config from "@/config";
import type { Job } from "@/types/job";
import { ApplicationsProvider, useApplications } from "@/context/ApplicationsContext";
import { useTableManager } from "@/hooks/useTableManager";
import SearchBar from "@/components/jobs/SearchBar";
import FilterSection from "@/components/jobs/FilterSection";
import SortSection from "@/components/jobs/SortSection";
import JobsTable from "@/components/jobs/JobsTable";
// simplified URL params; no custom query language

function InternshipsInner() {
  const [internships, setInternships] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersSaveState, setFiltersSaveState] = useState<{ status: "idle" | "saving" | "success" | "error"; message?: string }>({ status: "idle" });
  const [sortsSaveState, setSortsSaveState] = useState<{ status: "idle" | "saving" | "success" | "error"; message?: string }>({ status: "idle" });
  const { setUsername } = useApplications();
  const router = useRouter();
  const params = useSearchParams();
  const filtersSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sortsSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auth check removed - handled by AuthGate in layout
  // This prevents redundant router.replace() calls that can trigger
  // browser's history.replaceState() rate limiting

  useEffect(() => {
    try {
      const token = localStorage.getItem("jwt_token");
      const payload = token ? parseJwt(token) : null;
      const uname: string | null = (payload && typeof payload.sub === 'string') ? payload.sub : (payload && typeof payload.username === 'string') ? payload.username : null;
      setUsername(uname);
    } catch {
      setUsername(null);
    }
  }, [setUsername]);

  useEffect(() => {
    const fetchInternships = async () => {
      try {
        setLoading(true);
        const res = await fetch(config.api.internships);
        if (!res.ok) throw new Error("Failed to fetch listings");
        const listings = await res.json();
        if (!Array.isArray(listings)) throw new Error("Invalid data format");

        // Fetch tracker (best effort) to be used for hiding items present in tracker
        let trackerIds: string[] = [];
        try {
          const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
          if (token) {
            const tr = await fetch(buildApiUrl("/simplify/parsed"), {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
            if (tr.ok) {
              const tracker = await tr.json();
              if (Array.isArray(tracker)) {
                trackerIds = tracker
                  .map((t: { job_posting_id?: string | number }) => (t && t.job_posting_id != null ? String(t.job_posting_id) : null))
                  .filter((x: string | null): x is string => Boolean(x));
              }
            }
          }
        } catch {}

        const processed: Job[] = listings.map((item: {
          id: string;
          company_name: string;
          title: string;
          locations: string | string[];
          url?: string;
          source?: string;
          date_posted: number;
          active?: boolean;
        }) => ({
          id: item.id,
          company_name: item.company_name,
          title: item.title,
          locations: Array.isArray(item.locations) ? item.locations.join(", ") : item.locations,
          url: item.url,
          source: item.source,
          date_posted: new Date(item.date_posted * 1000).toLocaleDateString(),
            active: item.active ?? true,
        }));

        // If we have tracker IDs, attempt to mark them hidden via bulk update API
        setInternships(processed);
        if (trackerIds.length > 0) {
          // Use bulk update endpoint to prevent API flooding
          setTimeout(async () => {
            try {
              const token = typeof window !== "undefined" ? localStorage.getItem("jwt_token") : null;
              if (!token) return;
              await fetch(buildApiUrl("/applications/bulk"), {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  job_ids: trackerIds,
                  status: "hidden",
                  value: true
                }),
              }).catch(() => {});
            } catch {}
          }, 0);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    fetchInternships();
  }, []);

  const {
    paginatedData,
    pageSize,
    setPageSize,
    page,
    totalPages,
    goToPage,
    searchQuery,
    setSearchQuery,
    searchMode,
    setSearchMode,
    searchField,
    setSearchField,
    searchInFiltered,
    setSearchInFiltered,
    activeFilters,
    setActiveFilters,
    activeSorts,
    setActiveSorts,
    resetFilters,
    resetSorts,
    clearAll,
    // totalCount,
    searchedData,
  } = useTableManager(internships);

  // Load saved rules from profile and apply as defaults
  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("jwt_token");
        if (!token) return;
        const res = await fetch(buildApiUrl("/auth/me"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) return;
        const me = await res.json();
        if (Array.isArray(me?.filter_rules)) {
          setActiveFilters(me.filter_rules);
        }
        if (Array.isArray(me?.sort_rules)) {
          setActiveSorts(me.sort_rules);
        }
      } catch {}
    };
    run();
  }, [setActiveFilters, setActiveSorts]);

  // URL → state (initial)
  useEffect(() => {
    const q = params.get("q");
    const p = params.get("page");
    const s = params.get("size");
    const scope = params.get("scope");
    const mode = params.get("mode");
    const field = params.get("field");
    if (q) setSearchQuery(q);
    if (p) goToPage(Number(p));
    if (s) setPageSize(Number(s));
    if (scope) setSearchInFiltered(scope === "filtered");
    if (mode === "fuzzy" || mode === "exact") setSearchMode(mode);
    if (field === "all" || field === "company_name" || field === "title" || field === "locations") {
      setSearchField(field as "all" | "company_name" | "title" | "locations");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (filtersSaveTimeoutRef.current) clearTimeout(filtersSaveTimeoutRef.current);
      if (sortsSaveTimeoutRef.current) clearTimeout(sortsSaveTimeoutRef.current);
    };
  }, []);

  // state → URL (throttled to prevent history.replaceState() rate limiting)
  const urlSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Clear any pending updates
    if (urlSyncTimeoutRef.current) {
      clearTimeout(urlSyncTimeoutRef.current);
    }

    // Throttle URL updates to max once per 100ms to avoid browser rate limiting
    urlSyncTimeoutRef.current = setTimeout(() => {
      const usp = new URLSearchParams();
      if (searchQuery) usp.set("q", searchQuery);
      if (page > 1) usp.set("page", String(page));
      if (pageSize !== 25) usp.set("size", String(pageSize));
      usp.set("scope", searchInFiltered ? "filtered" : "all");
      usp.set("mode", searchMode);
      usp.set("field", searchField);
      const qs = usp.toString();
      router.replace(`/internships${qs ? `?${qs}` : ""}`);
    }, 100);

    return () => {
      if (urlSyncTimeoutRef.current) {
        clearTimeout(urlSyncTimeoutRef.current);
      }
    };
  }, [router, searchQuery, page, pageSize, searchInFiltered, searchMode, searchField]);


  if (loading) return <p className="text-sm text-muted">Loading internships…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;

  return (
    <section className="flex flex-col gap-6">
      {(() => {
        const filtersCount = activeFilters.length;
        const sortsCount = activeSorts.length;
        return (
          <details className="rounded-lg border border-default">
            <summary className="flex items-center justify-between cursor-pointer px-4 py-3 select-none">
              <span className="text-sm font-medium">Search & Filters</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted">Filters</span>
                <span className="rounded bg-gray-800 px-2 py-0.5 text-xs border border-default">{filtersCount}</span>
                <span className="ml-3 text-xs text-muted">Sorts</span>
                <span className="rounded bg-gray-800 px-2 py-0.5 text-xs border border-default">{sortsCount}</span>
              </span>
            </summary>
            <div className="space-y-4 px-4 pb-4 pt-2">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                mode={searchMode}
                setMode={setSearchMode}
                field={searchField}
                setField={setSearchField}
                searchInFiltered={searchInFiltered}
                setSearchInFiltered={setSearchInFiltered}
              />

              <div className="flex gap-2 flex-wrap">
                <button onClick={resetFilters} className="rounded-md border border-default px-3 py-1.5 text-sm hover:bg:white/5">Reset Filters</button>
                <button onClick={resetSorts} className="rounded-md border border-default px-3 py-1.5 text-sm hover:bg:white/5">Reset Sorts</button>
                <button onClick={clearAll} className="rounded-md border border-default px-3 py-1.5 text-sm hover:bg:white/5">Clear All</button>
              </div>

              <details open>
                <summary className="cursor-pointer text-sm font-medium">
                  Filters
                  <span className="ml-2 rounded bg-gray-800 px-2 py-0.5 text-xs border border-default align-middle">{filtersCount}</span>
                </summary>
                <div className="mt-3 space-y-2">
                  <FilterSection activeFilters={activeFilters} setActiveFilters={setActiveFilters} />
                  <div className="flex items-center gap-2">
                    <button
                      title="Save filters to profile"
                      disabled={filtersSaveState.status === "saving"}
                      onClick={async () => {
                        try {
                          setFiltersSaveState({ status: "saving" });
                          const token = localStorage.getItem("jwt_token");
                          if (!token) throw new Error("Not logged in");
                          const res = await fetch(buildApiUrl("/auth/me/rules"), {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ filter_rules: activeFilters }),
                          });
                          if (!res.ok) {
                            const j = await res.json().catch(() => ({}));
                            throw new Error(j?.detail || j?.error || "Failed to save filters");
                          }
                          setFiltersSaveState({ status: "success", message: "Saved" });
                        } catch (e: unknown) {
                          setFiltersSaveState({ status: "error", message: e instanceof Error ? e.message : "Failed" });
                        } finally {
                          if (filtersSaveTimeoutRef.current) clearTimeout(filtersSaveTimeoutRef.current);
                          filtersSaveTimeoutRef.current = setTimeout(() => setFiltersSaveState({ status: "idle" }), 2000);
                        }
                      }}
                      className="rounded-md border border-default px-3 py-1.5 text-xs hover:bg-white/5"
                    >
                      Save Filters
                    </button>
                    <span aria-live="polite">
                      {filtersSaveState.status === "saving" && <span className="text-xs text-muted">Saving…</span>}
                      {filtersSaveState.status === "success" && <span className="text-xs text-green-400">Saved!</span>}
                      {filtersSaveState.status === "error" && <span className="text-xs text-red-400">{filtersSaveState.message}</span>}
                    </span>
                  </div>
                </div>
              </details>
              <details open>
                <summary className="cursor-pointer text-sm font-medium">
                  Sort
                  <span className="ml-2 rounded bg-gray-800 px-2 py-0.5 text-xs border border-default align-middle">{sortsCount}</span>
                </summary>
                <div className="mt-3 space-y-2">
                  <SortSection activeSorts={activeSorts} setActiveSorts={setActiveSorts} />
                  <div className="flex items-center gap-2">
                    <button
                      title="Save sorts to profile"
                      disabled={sortsSaveState.status === "saving"}
                      onClick={async () => {
                        try {
                          setSortsSaveState({ status: "saving" });
                          const token = localStorage.getItem("jwt_token");
                          if (!token) throw new Error("Not logged in");
                          const res = await fetch(buildApiUrl("/auth/me/rules"), {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ sort_rules: activeSorts }),
                          });
                          if (!res.ok) {
                            const j = await res.json().catch(() => ({}));
                            throw new Error(j?.detail || j?.error || "Failed to save sorts");
                          }
                          setSortsSaveState({ status: "success", message: "Saved" });
                        } catch (e: unknown) {
                          setSortsSaveState({ status: "error", message: e instanceof Error ? e.message : "Failed" });
                        } finally {
                          if (sortsSaveTimeoutRef.current) clearTimeout(sortsSaveTimeoutRef.current);
                          sortsSaveTimeoutRef.current = setTimeout(() => setSortsSaveState({ status: "idle" }), 2000);
                        }
                      }}
                      className="rounded-md border border-default px-3 py-1.5 text-xs hover:bg-white/5"
                    >
                      Save Sorts
                    </button>
                    <span aria-live="polite">
                      {sortsSaveState.status === "saving" && <span className="text-xs text-muted">Saving…</span>}
                      {sortsSaveState.status === "success" && <span className="text-xs text-green-400">Saved!</span>}
                      {sortsSaveState.status === "error" && <span className="text-xs text-red-400">{sortsSaveState.message}</span>}
                    </span>
                  </div>
                </div>
              </details>
            </div>
          </details>
        );
      })()}

      <JobsTable
        jobs={paginatedData}
        pageSize={pageSize}
        currentPage={page}
        onPageChange={goToPage}
        onPageSizeChange={setPageSize}
        totalPages={totalPages}
        totalCount={searchedData.length}
        activeSorts={activeSorts}
        setActiveSorts={setActiveSorts}
        searchQuery={searchQuery}
      />
    </section>
  );
}

export default function InternshipsPage() {
  return (
    <ApplicationsProvider>
      <InternshipsInner />
    </ApplicationsProvider>
  );
}

