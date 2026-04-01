"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCurrentUserId } from "@/lib/supabase/audit";

type LlmProviderRow = {
  id: string | number;
  name: string | null;
  created_datetime_utc?: string | null;
  created_at?: string | null;
};

type LlmProvidersManagerProps = {
  rows: LlmProviderRow[];
  hasError: boolean;
};

const TABLE_NAME = "llm_providers";
const CREATED_KEYS = ["created_datetime_utc", "created_at", "created_on"];

function getCreatedValue(row: LlmProviderRow) {
  for (const key of CREATED_KEYS) {
    const value = row[key as keyof LlmProviderRow];
    if (value) return value as string;
  }
  return null;
}

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

function compareIds(a: string | number, b: string | number) {
  const aNum = Number(a);
  const bNum = Number(b);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    return aNum - bNum;
  }
  return String(a).localeCompare(String(b));
}

function sortRows(rows: LlmProviderRow[]) {
  return [...rows].sort((a, b) => compareIds(a.id, b.id));
}

export default function LlmProvidersManager({
  rows,
  hasError,
}: LlmProvidersManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [localRows, setLocalRows] = useState(rows);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const sortedRows = useMemo(() => sortRows(localRows), [localRows]);

  const startEditing = (row: LlmProviderRow) => {
    setEditingId(row.id);
    setDraftName(row.name ?? "");
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftName("");
    setErrorMessage(null);
  };

  const handleCreate = useCallback(async () => {
    const normalized = newName.trim();

    if (!normalized) {
      setErrorMessage("Enter a provider name to add.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    const userId = await getCurrentUserId(supabase);
    if (!userId) {
      setErrorMessage("You must be signed in to add a provider.");
      setIsCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        name: normalized,
        created_by_user_id: userId,
        modified_by_user_id: userId,
      })
      .select("*")
      .single();

    if (error || !data) {
      setErrorMessage("Failed to add provider.");
      setIsCreating(false);
      return;
    }

    setLocalRows((prev) => sortRows([data as LlmProviderRow, ...prev]));
    setNewName("");
    setIsCreating(false);
  }, [newName, supabase]);

  const handleSave = useCallback(
    async (row: LlmProviderRow) => {
      const normalized = draftName.trim();

      if (!normalized) {
        setErrorMessage("Enter a provider name to save.");
        return;
      }

      setSavingId(row.id);
      setErrorMessage(null);

      const userId = await getCurrentUserId(supabase);
      if (!userId) {
        setErrorMessage("You must be signed in to save providers.");
        setSavingId(null);
        return;
      }

      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ name: normalized, modified_by_user_id: userId })
        .eq("id", row.id);

      if (error) {
        setErrorMessage("Failed to save provider.");
        setSavingId(null);
        return;
      }

      setLocalRows((prev) =>
        sortRows(
          prev.map((item) =>
            item.id === row.id ? { ...item, name: normalized } : item
          )
        )
      );
      setSavingId(null);
      setEditingId(null);
      setDraftName("");
    },
    [draftName, supabase]
  );

  const handleDelete = useCallback(
    async (row: LlmProviderRow) => {
      const confirmed = window.confirm(
        "Are you sure you want to remove this provider?"
      );
      if (!confirmed) return;

      setDeletingId(row.id);
      setErrorMessage(null);

      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("id", row.id);

      if (error) {
        setErrorMessage("Failed to delete provider.");
        setDeletingId(null);
        return;
      }

      setLocalRows((prev) => prev.filter((item) => item.id !== row.id));
      if (editingId === row.id) {
        cancelEditing();
      }
      setDeletingId(null);
    },
    [editingId, supabase]
  );

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-900/40 p-6 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {hasError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          Failed to load providers due to RLS policies.
        </div>
      )}
      {errorMessage && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-2xl border border-zinc-800 bg-black/40 px-4 py-2 text-xs text-zinc-400">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="e.g. OpenAI"
            className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={isCreating}
          className="rounded-2xl border border-blue-500/40 bg-blue-500/80 px-5 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-60"
        >
          {isCreating ? "Adding..." : "+ Add"}
        </button>
      </div>

      {sortedRows.length === 0 && !hasError ? (
        <div className="rounded-2xl border border-zinc-800 bg-black/40 px-4 py-6 text-sm text-zinc-500">
          No providers configured yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-black/40">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Created Datetime UTC</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sortedRows.map((row) => {
                const isEditing = editingId === row.id;
                const isSaving = savingId === row.id;
                const isDeleting = deletingId === row.id;
                const createdValue = getCreatedValue(row);

                return (
                  <tr key={String(row.id)} className="text-zinc-200">
                    <td className="px-4 py-3 text-zinc-400">
                      {String(row.id)}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatTimestamp(createdValue)}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void handleSave(row);
                            }
                          }}
                          className="w-full min-w-[180px] rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-zinc-100">
                          {row.name ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSave(row)}
                              disabled={isSaving}
                              className="rounded-full border border-emerald-500/40 bg-emerald-500/80 px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-60"
                            >
                              {isSaving ? "Saving..." : "Save"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditing(row)}
                              className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(row)}
                              disabled={isDeleting}
                              className="rounded-full border border-red-500/40 bg-red-500/80 px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-60"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
