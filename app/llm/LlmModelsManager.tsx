"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LlmModelRow = {
  id: string | number;
  name?: string | null;
  llm_provider_id?: string | number | null;
  provider_model_id?: string | number | null;
  is_temperature_supported?: boolean | number | null;
  created_datetime_utc?: string | null;
  created_at?: string | null;
};

type LlmModelsManagerProps = {
  rows: LlmModelRow[];
  hasError: boolean;
};

const TABLE_NAME = "llm_models";
const CREATED_KEYS = ["created_datetime_utc", "created_at", "created_on"];

function getCreatedValue(row: LlmModelRow) {
  for (const key of CREATED_KEYS) {
    const value = row[key as keyof LlmModelRow];
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

function sortRows(rows: LlmModelRow[]) {
  return [...rows].sort((a, b) => compareIds(a.id, b.id));
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isNaN(num)) return num;
  return trimmed;
}

function coerceBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return false;
}

function formatBoolean(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value === 1 ? "true" : "false";
  if (typeof value === "string") return value.toLowerCase();
  return "—";
}

export default function LlmModelsManager({
  rows,
  hasError,
}: LlmModelsManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [localRows, setLocalRows] = useState(rows);
  const [newName, setNewName] = useState("");
  const [newProviderId, setNewProviderId] = useState("");
  const [newProviderModelId, setNewProviderModelId] = useState("");
  const [newTemperatureSupported, setNewTemperatureSupported] =
    useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftProviderId, setDraftProviderId] = useState("");
  const [draftProviderModelId, setDraftProviderModelId] = useState("");
  const [draftTemperatureSupported, setDraftTemperatureSupported] =
    useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const sortedRows = useMemo(() => sortRows(localRows), [localRows]);

  const startEditing = (row: LlmModelRow) => {
    setEditingId(row.id);
    setDraftName(row.name ?? "");
    setDraftProviderId(
      row.llm_provider_id !== null && row.llm_provider_id !== undefined
        ? String(row.llm_provider_id)
        : ""
    );
    setDraftProviderModelId(
      row.provider_model_id !== null && row.provider_model_id !== undefined
        ? String(row.provider_model_id)
        : ""
    );
    setDraftTemperatureSupported(coerceBoolean(row.is_temperature_supported));
    setErrorMessage(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftName("");
    setDraftProviderId("");
    setDraftProviderModelId("");
    setDraftTemperatureSupported(false);
    setErrorMessage(null);
  };

  const handleCreate = useCallback(async () => {
    const normalizedName = normalizeText(newName);

    if (!normalizedName) {
      setErrorMessage("Enter a model name to add.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    const payload = {
      name: normalizedName,
      llm_provider_id: normalizeOptionalNumber(newProviderId),
      provider_model_id: normalizeText(newProviderModelId),
      is_temperature_supported: newTemperatureSupported,
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      setErrorMessage("Failed to add model.");
      setIsCreating(false);
      return;
    }

    setLocalRows((prev) => sortRows([data as LlmModelRow, ...prev]));
    setNewName("");
    setNewProviderId("");
    setNewProviderModelId("");
    setNewTemperatureSupported(false);
    setIsCreating(false);
  }, [newName, newProviderId, newProviderModelId, newTemperatureSupported, supabase]);

  const handleSave = useCallback(
    async (row: LlmModelRow) => {
      const normalizedName = normalizeText(draftName);

      if (!normalizedName) {
        setErrorMessage("Enter a model name to save.");
        return;
      }

      setSavingId(row.id);
      setErrorMessage(null);

      const payload = {
        name: normalizedName,
        llm_provider_id: normalizeOptionalNumber(draftProviderId),
        provider_model_id: normalizeText(draftProviderModelId),
        is_temperature_supported: draftTemperatureSupported,
      };

      const { error } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq("id", row.id);

      if (error) {
        setErrorMessage("Failed to save model.");
        setSavingId(null);
        return;
      }

      setLocalRows((prev) =>
        sortRows(
          prev.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  name: normalizedName,
                  llm_provider_id: payload.llm_provider_id,
                  provider_model_id: payload.provider_model_id,
                  is_temperature_supported: payload.is_temperature_supported,
                }
              : item
          )
        )
      );
      setSavingId(null);
      setEditingId(null);
      setDraftName("");
      setDraftProviderId("");
      setDraftProviderModelId("");
      setDraftTemperatureSupported(false);
    },
    [draftName, draftProviderId, draftProviderModelId, draftTemperatureSupported, supabase]
  );

  const handleDelete = useCallback(
    async (row: LlmModelRow) => {
      const confirmed = window.confirm(
        "Are you sure you want to remove this model?"
      );
      if (!confirmed) return;

      setDeletingId(row.id);
      setErrorMessage(null);

      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("id", row.id);

      if (error) {
        setErrorMessage("Failed to delete model.");
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
          Failed to load models due to RLS policies.
        </div>
      )}
      {errorMessage && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Name
            </span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. GPT-4.1"
              className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              LLM Provider ID
            </span>
            <input
              value={newProviderId}
              onChange={(event) => setNewProviderId(event.target.value)}
              placeholder="e.g. 1"
              className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Provider Model ID
            </span>
            <input
              value={newProviderModelId}
              onChange={(event) => setNewProviderModelId(event.target.value)}
              placeholder="e.g. gpt-4.1-2025-04-14"
              className="rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Temperature Supported
            </span>
            <label className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100">
              <input
                type="checkbox"
                checked={newTemperatureSupported}
                onChange={(event) =>
                  setNewTemperatureSupported(event.target.checked)
                }
                className="h-4 w-4 accent-amber-300"
              />
              {newTemperatureSupported ? "true" : "false"}
            </label>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={isCreating}
              className="w-full rounded-2xl border border-blue-500/40 bg-blue-500/80 px-5 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-60"
            >
              {isCreating ? "Adding..." : "+ Add"}
            </button>
          </div>
        </div>
      </div>

      {sortedRows.length === 0 && !hasError ? (
        <div className="rounded-2xl border border-zinc-800 bg-black/40 px-4 py-6 text-sm text-zinc-500">
          No models configured yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-black/40">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Created Datetime UTC</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">LLM Provider ID</th>
                <th className="px-4 py-3">Provider Model ID</th>
                <th className="px-4 py-3">Is Temperature Supported</th>
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
                          className="w-full min-w-[160px] rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-zinc-100">
                          {row.name ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={draftProviderId}
                          onChange={(event) =>
                            setDraftProviderId(event.target.value)
                          }
                          className="w-full min-w-[120px] rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
                        />
                      ) : (
                        <span className="text-sm text-zinc-200">
                          {row.llm_provider_id ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={draftProviderModelId}
                          onChange={(event) =>
                            setDraftProviderModelId(event.target.value)
                          }
                          className="w-full min-w-[180px] rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100 outline-none"
                        />
                      ) : (
                        <span className="text-sm text-zinc-200">
                          {row.provider_model_id ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <label className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm text-zinc-100">
                          <input
                            type="checkbox"
                            checked={draftTemperatureSupported}
                            onChange={(event) =>
                              setDraftTemperatureSupported(event.target.checked)
                            }
                            className="h-4 w-4 accent-amber-300"
                          />
                          {draftTemperatureSupported ? "true" : "false"}
                        </label>
                      ) : (
                        <span className="text-sm text-zinc-200">
                          {formatBoolean(row.is_temperature_supported)}
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
