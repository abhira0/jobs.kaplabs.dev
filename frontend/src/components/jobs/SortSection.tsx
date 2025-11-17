"use client";

import { useState } from "react";
import type { SortSpec } from "@/utils/sorts";
import SortModal from "./SortModal";

type Props = {
  activeSorts: SortSpec[];
  setActiveSorts: (s: SortSpec[]) => void;
};

export default function SortSection({ activeSorts, setActiveSorts }: Props) {
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [editingSort, setEditingSort] = useState<{ sort: SortSpec; index: number } | null>(null);

  const removeSort = (index: number) => setActiveSorts(activeSorts.filter((_, i) => i !== index));

  const onDrop = (oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    const next = [...activeSorts];
    const [removed] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, removed);
    setActiveSorts(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {activeSorts.map((sort, index) => (
          <div
            key={index}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(Number(e.dataTransfer.getData("text/plain")), index)}
            className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg text-sm border border-default cursor-move"
          >
            <div className="text-gray-200">
              {sort.column}
              <span className="ml-1 text-gray-400">{sort.order === "asc" ? "↑" : "↓"}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { setEditingSort({ sort, index }); setSortModalOpen(true); }} className="rounded-md border border-default px-2 text-xs hover:bg-white/5">Edit</button>
              <button onClick={() => removeSort(index)} className="rounded-md border border-default px-2 text-xs hover:bg-white/5">Remove</button>
            </div>
          </div>
        ))}
        <button onClick={() => setSortModalOpen(true)} className="rounded-md border border-dashed border-default px-2 text-xs hover:bg-white/5">+ Add sort</button>
      </div>
      <SortModal
        isOpen={sortModalOpen}
        onClose={() => { setSortModalOpen(false); setEditingSort(null); }}
        activeSorts={activeSorts}
        setActiveSorts={setActiveSorts}
        editingSort={editingSort}
      />
    </div>
  );
}



