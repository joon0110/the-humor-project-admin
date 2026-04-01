"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCurrentUserId } from "@/lib/supabase/audit";

type LlmEntityRow = Record<string, unknown>;

type LlmEntityManagerProps = {
  tableName: string;
  rows: LlmEntityRow[];
  hasError: boolean;
  entityLabel: string;
};

const ID_KEYS = ["id", "uuid", "model_id", "provider_id"];
const READ_ONLY_KEYS = new Set([
  ...ID_KEYS,
  "created_at",
  "created_datetime_utc",
  "created_by_user_id",
  "created_on",
  "created_time",
  "updated_at",
  "updated_datetime_utc",
  "modified_by_user_id",
  "modified_datetime_utc",
]);
const DISPLAY_KEYS = [
  "name",
  "model",
  "model_name",
  "provider",
  "provider_name",
  "slug",
  "key",
  "base_url",
  "api_base",
  "api_url",
  "endpoint",
  "is_active",
  "enabled",
  "status",
];

function getRowId(row: LlmEntityRow) {
  for (const key of ID_KEYS) {
    if (row[key] !== null && row[key] !== undefined) {
      return { key, value: row[key] };
    }
  }
  return null;
}

function getRowKey(row: LlmEntityRow) {
  const id = getRowId(row);
  if (!id) return null;
  return `${id.key}:${String(id.value)}`;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "n/a";
  if (typeof value === "string") {
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "n/a";
  }
}

function pickDisplayPairs(row: LlmEntityRow) {
  const pairs: { key: string; value: string }[] = [];
  for (const key of DISPLAY_KEYS) {
    if (row[key] !== null && row[key] !== undefined && row[key] !== "") {
      pairs.push({ key, value: formatValue(row[key]) });
    }
  }
  if (pairs.length > 0) return pairs.slice(0, 6);

  const fallbackKeys = Object.keys(row).filter(
    (key) => !READ_ONLY_KEYS.has(key)
  );
  for (const key of fallbackKeys.slice(0, 6)) {
    pairs.push({ key, value: formatValue(row[key]) });
  }
  return pairs;
}

function stripReadOnlyKeys(payload: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!READ_ONLY_KEYS.has(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

function parseJsonPayload(value: string) {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "JSON must be an object." } as const;
    }
    return { value: parsed as Record<string, unknown> } as const;
  } catch {
    return { error: "Invalid JSON." } as const;
  }
}

export default function LlmEntityManager({
  tableName,
  rows,
  hasError,
  entityLabel,
}: LlmEntityManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [localRows, setLocalRows] = useState(rows);
  const [newPayload, setNewPayload] = useState("{}");
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [draftPayload, setDraftPayload] = useState("{}");
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);
  const [deletingRowKey, setDeletingRowKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const startEditing = (row: LlmEntityRow) => {
    const rowKey = getRowKey(row);
    if (!rowKey) {
      setErrorMessage("Cannot edit rows without an id or uuid.");
      return;
    }
    setEditingRowKey(rowKey);
    setDraftPayload(JSON.stringify(stripReadOnlyKeys(row), null, 2));
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    setEditingRowKey(null);
    setDraftPayload("{}");
    setErrorMessage(null);
  };

  const handleCreate = useCallback(async () => {
    const parsed = parseJsonPayload(newPayload);
    if ("error" in parsed) {
      setErrorMessage(parsed.error ?? "Invalid JSON.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    const userId = await getCurrentUserId(supabase);
    if (!userId) {
      setErrorMessage(`You must be signed in to add ${entityLabel}.`);
      setIsCreating(false);
      return;
    }

    const payload = {
      ...parsed.value,
      created_by_user_id: userId,
      modified_by_user_id: userId,
    };

    const { data, error } = await supabase
      .from(tableName)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      setErrorMessage(`Failed to add ${entityLabel}.`);
      setIsCreating(false);
      return;
    }

    setLocalRows((prev) => [data as LlmEntityRow, ...prev]);
    setNewPayload("{}");
    setIsCreating(false);
  }, [entityLabel, newPayload, supabase, tableName]);

  const handleSave = useCallback(
    async (row: LlmEntityRow) => {
      const rowId = getRowId(row);
      if (!rowId) {
        setErrorMessage("Cannot save rows without an id or uuid.");
        return;
      }

      const parsed = parseJsonPayload(draftPayload);
      if ("error" in parsed) {
        setErrorMessage(parsed.error ?? "Invalid JSON.");
        return;
      }

      const updatePayload = stripReadOnlyKeys(parsed.value);
      if (Object.keys(updatePayload).length === 0) {
        setErrorMessage("No editable fields found in the payload.");
        return;
      }

      const userId = await getCurrentUserId(supabase);
      if (!userId) {
        setErrorMessage(`You must be signed in to save ${entityLabel}.`);
        return;
      }

      updatePayload.modified_by_user_id = userId;

      const rowKey = `${rowId.key}:${String(rowId.value)}`;
      setSavingRowKey(rowKey);
      setErrorMessage(null);

      const { error } = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq(rowId.key, rowId.value);

      if (error) {
        setErrorMessage(`Failed to save ${entityLabel}.`);
        setSavingRowKey(null);
        return;
      }

      setLocalRows((prev) =>
        prev.map((item) => {
          const itemId = getRowId(item);
          if (!itemId) return item;
          if (
            itemId.key === rowId.key &&
            String(itemId.value) === String(rowId.value)
          ) {
            return { ...item, ...updatePayload };
          }
          return item;
        })
      );

      setSavingRowKey(null);
      setEditingRowKey(null);
      setDraftPayload("{}");
    },
    [draftPayload, entityLabel, supabase, tableName]
  );

  const handleDelete = useCallback(
    async (row: LlmEntityRow) => {
      const rowId = getRowId(row);
      if (!rowId) {
        setErrorMessage("Cannot delete rows without an id or uuid.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete this ${entityLabel}?`
      );
      if (!confirmed) return;

      const rowKey = `${rowId.key}:${String(rowId.value)}`;
      setDeletingRowKey(rowKey);
      setErrorMessage(null);

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(rowId.key, rowId.value);

      if (error) {
        setErrorMessage(`Failed to delete ${entityLabel}.`);
        setDeletingRowKey(null);
        return;
      }

      setLocalRows((prev) =>
        prev.filter((item) => {
          const itemId = getRowId(item);
          if (!itemId) return true;
          return !(
            itemId.key === rowId.key &&
            String(itemId.value) === String(rowId.value)
          );
        })
      );

      if (editingRowKey === rowKey) {
        cancelEditing();
      }
      if (expandedRowKey === rowKey) {
        setExpandedRowKey(null);
      }
      setDeletingRowKey(null);
    },
    [editingRowKey, entityLabel, expandedRowKey, supabase, tableName]
  );

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {hasError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          Failed to load {entityLabel} records due to RLS policies.
        </div>
      )}
      {errorMessage && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Create {entityLabel}
        </div>
        <textarea
          value={newPayload}
          onChange={(event) => setNewPayload(event.target.value)}
          rows={6}
          spellCheck={false}
          className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={isCreating}
            className="rounded-full border border-amber-300/60 bg-amber-300/90 px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "Creating..." : `Add ${entityLabel}`}
          </button>
          <button
            type="button"
            onClick={() => setNewPayload("{}")}
            className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-900"
          >
            Reset
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          JSON must be an object. Required fields depend on the table schema.
        </p>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {localRows.length} {entityLabel} records
        </div>

        {localRows.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-400">
            No {entityLabel} records found.
          </div>
        ) : (
          <div className="space-y-3">
            {localRows.map((row, index) => {
              const rowKey = getRowKey(row);
              const rowId = getRowId(row);
              const stableKey = rowKey ?? `row:${index}`;
              const pairs = pickDisplayPairs(row);
              const isEditing = rowKey !== null && editingRowKey === rowKey;
              const isExpanded = expandedRowKey === stableKey;
              const isSaving = rowKey !== null && savingRowKey === rowKey;
              const isDeleting = rowKey !== null && deletingRowKey === rowKey;

              return (
                <div
                  key={stableKey}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">
                        {rowId
                          ? `${rowId.key}: ${String(rowId.value)}`
                          : "Missing id"}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                        {pairs.length === 0
                          ? "No preview fields available."
                          : pairs.map((pair) => (
                              <span
                                key={pair.key}
                                className="rounded-full border border-zinc-800 px-2 py-1"
                              >
                                {pair.key}: {pair.value}
                              </span>
                            ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRowKey(isExpanded ? null : stableKey)
                        }
                        className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isExpanded ? "Hide JSON" : "View JSON"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditing(row)}
                        disabled={!rowKey}
                        className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(row)}
                        disabled={isDeleting || !rowKey}
                        className="rounded-full border border-red-500/60 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-200">
                      {JSON.stringify(row, null, 2)}
                    </pre>
                  )}

                  {isEditing && (
                    <div className="mt-4 space-y-2">
                      <textarea
                        value={draftPayload}
                        onChange={(event) => setDraftPayload(event.target.value)}
                        rows={8}
                        spellCheck={false}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-xs text-zinc-200 outline-none"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSave(row)}
                          disabled={isSaving}
                          className="rounded-full border border-amber-300/60 bg-amber-300/90 px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
