"use client";

import { useEffect, useState } from "react";
import type { SortSpec } from "@/utils/sorts";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  activeSorts: SortSpec[];
  setActiveSorts: (s: SortSpec[]) => void;
  editingSort: { sort: SortSpec; index: number } | null;
};

export default function SortModal({ isOpen, onClose, activeSorts, setActiveSorts, editingSort }: Props) {
  const [column, setColumn] = useState<SortSpec["column"]>("company_name");
  const [order, setOrder] = useState<SortSpec["order"]>("asc");

  useEffect(() => {
    if (editingSort) {
      setColumn(editingSort.sort.column);
      setOrder(editingSort.sort.order);
    } else {
      setColumn("company_name");
      setOrder("asc");
    }
  }, [editingSort]);

  const handleApply = () => {
    const newSort: SortSpec = { column, order };
    if (editingSort) {
      const next = [...activeSorts];
      next[editingSort.index] = newSort;
      setActiveSorts(next);
    } else {
      setActiveSorts([...activeSorts, newSort]);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-default bg-gray-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{editingSort ? "Edit Sort" : "Add Sort"}</h3>
          <button onClick={onClose} className="text-sm text-muted hover:text-white">Close</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Column</label>
            <select
              value={column}
              onChange={(e) => setColumn(e.target.value as SortSpec["column"])}
              className="w-full rounded-md border border-default bg-gray-900 text-gray-100 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-white/10"
              style={{ colorScheme: "dark" }}
            >
              <option value="company_name">Company Name</option>
              <option value="title">Job Title</option>
              <option value="locations">Location</option>
              <option value="date_posted">Date Updated</option>
              <option value="active">Status</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Order</label>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as SortSpec["order"])}
              className="w-full rounded-md border border-default bg-gray-900 text-gray-100 px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-white/10"
              style={{ colorScheme: "dark" }}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="focus-ring rounded-md border border-default px-3 py-2 text-sm hover:bg-white/5">Cancel</button>
            <button onClick={handleApply} className="focus-ring rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">{editingSort ? "Update" : "Add"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}



