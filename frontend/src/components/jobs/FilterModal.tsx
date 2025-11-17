"use client";

import { useEffect, useState } from "react";
import type { ActiveFilter, TextCondition } from "@/utils/filters";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: ActiveFilter[];
  setActiveFilters: (f: ActiveFilter[]) => void;
  editingFilter: { filter: ActiveFilter; index: number } | null;
};

export default function FilterModal({ isOpen, onClose, activeFilters, setActiveFilters, editingFilter }: Props) {
  const [column, setColumn] = useState<ActiveFilter["column"]>("company_name");
  const [conditions, setConditions] = useState<TextCondition[]>([{ type: "contains", value: "" }]);
  const [conditionType, setConditionType] = useState<"AND" | "OR">("OR");
  const [dateRange, setDateRange] = useState<{ fromDate?: string; toDate?: string }>({});
  const [booleanValue, setBooleanValue] = useState<boolean>(true);

  useEffect(() => {
    if (editingFilter) {
      const { filter } = editingFilter;
      setColumn(filter.column);
      if (filter.column === "date_posted") {
        setDateRange({ fromDate: filter.fromDate, toDate: filter.toDate });
      } else if (["active", "hidden", "applied"].includes(filter.column)) {
        setBooleanValue((filter as Record<string, unknown>)[filter.column] as boolean);
      } else if ("conditions" in filter) {
        setConditions(filter.conditions);
        setConditionType(filter.conditionType);
      }
    } else {
      setColumn("company_name");
      setConditions([{ type: "contains", value: "" }]);
      setConditionType("OR");
      setDateRange({});
      setBooleanValue(true);
    }
  }, [editingFilter]);

  const handleApply = () => {
    let newFilter: ActiveFilter;
    if (column === "date_posted") {
      newFilter = { column, ...dateRange };
    } else if (["active", "hidden", "applied"].includes(column)) {
      newFilter = { column, [column]: booleanValue } as ActiveFilter;
    } else {
      newFilter = { column, conditions, conditionType } as ActiveFilter;
    }
    if (editingFilter) {
      const next = [...activeFilters];
      next[editingFilter.index] = newFilter;
      setActiveFilters(next);
    } else {
      setActiveFilters([...activeFilters, newFilter]);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-lg border border-default bg-gray-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Add Filter</h3>
          <button onClick={onClose} className="text-sm text-muted hover:text-white">Close</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Column</label>
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value as ActiveFilter["column"])}
              className="w-full rounded-md border border-default bg-gray-900 text-gray-100 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-white/10"
              style={{ colorScheme: "dark" }}
            >
              <option value="company_name">Company</option>
              <option value="title">Role</option>
              <option value="locations">Location</option>
              <option value="date_posted">Date Posted</option>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
              {/* Note: 'applied' intentionally not shown for new filters; it's handled for backward compatibility when editing existing filters */}
            </select>
          </div>

          {column === "date_posted" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">From Date</label>
                <input type="date" value={dateRange.fromDate ?? ""} onChange={(e) => setDateRange({ ...dateRange, fromDate: e.target.value })} className="w-full rounded-md border border-default bg-transparent px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm mb-1">To Date</label>
                <input type="date" value={dateRange.toDate ?? ""} onChange={(e) => setDateRange({ ...dateRange, toDate: e.target.value })} className="w-full rounded-md border border-default bg-transparent px-3 py-2 text-sm" />
              </div>
            </div>
          ) : ["active", "hidden", "applied"].includes(column) ? (
            <div>
              <label className="block text-sm mb-1">Value</label>
              <select value={String(booleanValue)} onChange={(e) => setBooleanValue(e.target.value === "true")} className="w-full rounded-md border border-default bg-transparent px-3 py-2 text-sm">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Condition Type</label>
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value as "AND" | "OR")}
                className="w-full rounded-md border border-default bg-gray-900 text-gray-100 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-white/10"
                style={{ colorScheme: "dark" }}
              >
                  <option value="OR">OR</option>
                  <option value="AND">AND</option>
                </select>
              </div>
              {conditions.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    value={c.type}
                    onChange={(e) => setConditions((prev) => prev.map((x, idx) => (idx === i ? { ...x, type: e.target.value as TextCondition["type"] } : x)))}
                    className="rounded-md border border-default bg-gray-900 text-gray-100 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-white/10"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="contains">Contains</option>
                    <option value="equals">Equals</option>
                    <option value="not-equals">Not Equals</option>
                    <option value="not-contains">Not Contains</option>
                    <option value="regex">Regex</option>
                    <option value="not-regex">Not Regex</option>
                  </select>
                  <input
                    value={c.value}
                    onChange={(e) => setConditions((prev) => prev.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))}
                    className="flex-1 rounded-md border border-default bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/10"
                    style={{ colorScheme: "dark" }}
                  />
                  <button onClick={() => setConditions((prev) => [...prev, { type: "contains", value: "" }])} className="rounded-md border border-default px-2 text-sm hover:bg-white/5">+</button>
                  {conditions.length > 1 ? (
                    <button onClick={() => setConditions((prev) => prev.filter((_, idx) => idx !== i))} className="rounded-md border border-default px-2 text-sm hover:bg-white/5">-</button>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="focus-ring rounded-md border border-default px-3 py-2 text-sm hover:bg-white/5">Cancel</button>
            <button onClick={handleApply} className="focus-ring rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}



