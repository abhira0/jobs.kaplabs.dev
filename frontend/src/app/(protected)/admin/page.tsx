"use client";

import { useState } from "react";
import AdminInvites from "@/components/admin/AdminInvites";
import AdminUsers from "@/components/admin/AdminUsers";

export default function AdminPage() {
  const [tab, setTab] = useState<"invites" | "users">("invites");
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-default">
        <button
          onClick={() => setTab("invites")}
          className={`px-3 py-2 text-sm border-b-2 ${tab === "invites" ? "border-white text-white" : "border-transparent text-muted hover:text-white"}`}
        >
          Invites
        </button>
        <button
          onClick={() => setTab("users")}
          className={`px-3 py-2 text-sm border-b-2 ${tab === "users" ? "border-white text-white" : "border-transparent text-muted hover:text-white"}`}
        >
          Users
        </button>
      </div>
      <div>
        {tab === "invites" ? <AdminInvites /> : <AdminUsers />}
      </div>
    </section>
  );
}



