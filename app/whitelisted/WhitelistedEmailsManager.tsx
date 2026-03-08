"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type WhitelistedEmailRow = {
  id: string | number;
  email_address: string | null;
  created_datetime_utc?: string | null;
};

type WhitelistedEmailsManagerProps = {
  rows: WhitelistedEmailRow[];
  hasError: boolean;
};

const TABLE_NAME = "whitelist_email_addresses";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isValidEmail = (value: string) => {
  if (!value) return false;
  if (value.includes(" ")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const sortRows = (rows: WhitelistedEmailRow[]) =>
  [...rows].sort((a, b) => {
    const aEmail = a.email_address ?? "";
    const bEmail = b.email_address ?? "";
    return aEmail.localeCompare(bEmail);
  });

export default function WhitelistedEmailsManager({
  rows,
  hasError,
}: WhitelistedEmailsManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [localRows, setLocalRows] = useState(rows);
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draftEmail, setDraftEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const sortedRows = useMemo(() => sortRows(localRows), [localRows]);

  const startEditing = (row: WhitelistedEmailRow) => {
    setEditingId(row.id);
    setDraftEmail(row.email_address ?? "");
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftEmail("");
    setErrorMessage(null);
  };

  const handleCreate = useCallback(async () => {
    const normalized = normalizeEmail(newEmail);

    if (!normalized) {
      setErrorMessage("Enter an email address to add.");
      return;
    }

    if (!isValidEmail(normalized)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    if (
      localRows.some(
        (row) => (row.email_address ?? "").toLowerCase() === normalized
      )
    ) {
      setErrorMessage("That email address already exists.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({ email_address: normalized })
      .select("*")
      .single();

    if (error || !data) {
      setErrorMessage("Failed to add email address.");
      setIsCreating(false);
      return;
    }

    setLocalRows((prev) => sortRows([data as WhitelistedEmailRow, ...prev]));
    setNewEmail("");
    setIsCreating(false);
  }, [supabase, newEmail, localRows]);

  const handleSave = useCallback(
    async (row: WhitelistedEmailRow) => {
      const normalized = normalizeEmail(draftEmail);

      if (!normalized) {
        setErrorMessage("Enter an email address to save.");
        return;
      }

      if (!isValidEmail(normalized)) {
        setErrorMessage("Enter a valid email address.");
        return;
      }

      if (
        localRows.some(
          (item) =>
            item.id !== row.id &&
            (item.email_address ?? "").toLowerCase() === normalized
        )
      ) {
        setErrorMessage("That email address already exists.");
        return;
      }

      setIsSaving(true);
      setErrorMessage(null);

      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ email_address: normalized })
        .eq("id", row.id);

      if (error) {
        setErrorMessage("Failed to save email address.");
        setIsSaving(false);
        return;
      }

      setLocalRows((prev) =>
        sortRows(
          prev.map((item) =>
            item.id === row.id
              ? { ...item, email_address: normalized }
              : item
          )
        )
      );
      setIsSaving(false);
      setEditingId(null);
      setDraftEmail("");
    },
    [supabase, draftEmail, localRows]
  );

  const handleDelete = useCallback(
    async (row: WhitelistedEmailRow) => {
      const confirmed = window.confirm(
        "Are you sure you want to remove this email address?"
      );
      if (!confirmed) return;

      setIsDeleting(true);
      setErrorMessage(null);

      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("id", row.id);

      if (error) {
        setErrorMessage("Failed to delete email address.");
        setIsDeleting(false);
        return;
      }

      setLocalRows((prev) => prev.filter((item) => item.id !== row.id));
      if (editingId === row.id) {
        cancelEditing();
      }
      setIsDeleting(false);
    },
    [supabase, editingId]
  );

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {hasError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          Failed to load whitelisted emails due to RLS policies.
        </div>
      )}
      {errorMessage && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-400">
          <input
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="e.g. name@example.com"
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

      <div className="space-y-3">
        {sortedRows.length === 0 && !hasError && (
          <div className="rounded-2xl border border-zinc-800 bg-black/40 px-4 py-6 text-sm text-zinc-500">
            No whitelisted email addresses yet.
          </div>
        )}
        {sortedRows.map((row) => {
          const isEditing = editingId === row.id;

          return (
            <div
              key={String(row.id)}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-black/40 px-4 py-3 text-zinc-200"
            >
              <div className="flex min-w-[220px] flex-1 items-center">
                {isEditing ? (
                  <input
                    value={draftEmail}
                    onChange={(event) => setDraftEmail(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSave(row);
                      }
                    }}
                    className="w-full rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
                  />
                ) : (
                  <div className="text-sm font-semibold text-zinc-100">
                    {row.email_address ?? "—"}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
