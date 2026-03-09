"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type HumorFlavorRow = Record<string, unknown>;
type HumorFlavorStepRow = Record<string, unknown>;

type HumorFlavorsTableProps = {
  rows: HumorFlavorRow[];
  hasError: boolean;
};

const FLAVOR_ID_KEYS = ["id", "flavor_id", "humor_flavor_id", "uuid"];
const FLAVOR_SLUG_KEYS = ["slug", "name", "flavor", "humor_flavor"];
const FLAVOR_DESCRIPTION_KEYS = [
  "description",
  "summary",
  "details",
  "prompt",
  "notes",
];
const FLAVOR_THEME_KEYS = [
  "themes",
  "theme_names",
  "theme_labels",
  "theme_list",
  "tags",
];

const STEP_TABLE_CANDIDATES = [
  "humor_flavor_steps",
  "llm_humor_flavor_steps",
  "humor_flavour_steps",
];
const STEP_FLAVOR_ID_KEYS = [
  "humor_flavor_id",
  "humour_flavour_id",
  "flavor_id",
  "flavour_id",
  "humor_flavor",
  "humour_flavour",
  "humor_flavour",
];
const STEP_ID_KEYS = [
  "id",
  "step_id",
  "humor_flavor_step_id",
  "uuid",
];
const STEP_ORDER_KEYS = [
  "step_number",
  "step_index",
  "step_order",
  "order",
  "order_by",
  "position",
];
const STEP_TYPE_KEYS = [
  "step_type",
  "step_type_name",
  "humor_flavor_step_type",
  "humor_step_type",
  "humor_flavor_step_type_name",
  "type",
];
const STEP_TYPE_ID_KEYS = [
  "humor_flavor_step_type_id",
  "humour_flavour_step_type_id",
  "humor_step_type_id",
  "step_type_id",
  "type_id",
];
const STEP_MODEL_KEYS = ["llm_model", "model", "model_name", "llm_model_name"];
const STEP_MODEL_ID_KEYS = [
  "llm_model_id",
  "model_id",
  "llm_model_uuid",
  "model_uuid",
];
const STEP_INPUT_TYPE_ID_KEYS = [
  "llm_input_type_id",
  "input_type_id",
  "input_type",
  "llm_input_type",
];
const STEP_OUTPUT_TYPE_ID_KEYS = [
  "llm_output_type_id",
  "output_type_id",
  "output_type",
  "llm_output_type",
];
const STEP_INPUT_KEYS = [
  "input_type",
  "input_type_name",
  "llm_input_type",
  "llm_input_type_name",
  "input",
];
const STEP_OUTPUT_KEYS = [
  "output_type",
  "output_type_name",
  "llm_output_type",
  "llm_output_type_name",
  "output",
];
const STEP_SYSTEM_PROMPT_KEYS = [
  "llm_system_prompt",
  "system_prompt",
  "system",
  "system_message",
  "system_text",
  "system_instructions",
];
const STEP_USER_PROMPT_KEYS = [
  "llm_user_prompt",
  "user_prompt",
  "prompt",
  "user_message",
  "user_text",
  "user_instructions",
];
const STEP_TEMPERATURE_KEYS = [
  "llm_temperature",
  "temperature",
  "temp",
  "sampling_temperature",
  "sampling_temp",
];

function pickValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

function formatThemes(value: unknown) {
  if (value === null || value === undefined || value === "") return [] as string[];
  if (Array.isArray(value)) {
    return value
      .map((item) => (item == null ? "" : String(item).trim()))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [String(value)];
}

function getFlavorLabel(row: HumorFlavorRow) {
  const slug = pickValue(row, FLAVOR_SLUG_KEYS);
  if (slug) return String(slug);
  const id = pickValue(row, FLAVOR_ID_KEYS);
  return id ? String(id) : "Untitled flavor";
}

function getFlavorDescription(row: HumorFlavorRow) {
  const description = pickValue(row, FLAVOR_DESCRIPTION_KEYS);
  return description ? String(description) : "—";
}

function getFlavorThemes(row: HumorFlavorRow) {
  for (const key of FLAVOR_THEME_KEYS) {
    const themes = formatThemes(row[key]);
    if (themes.length > 0) return themes;
  }
  return [] as string[];
}

function formatStepOrder(step: HumorFlavorStepRow, fallbackIndex: number) {
  const orderValue = pickValue(step, STEP_ORDER_KEYS);
  if (orderValue === null || orderValue === undefined || orderValue === "") {
    return String(fallbackIndex + 1);
  }
  const asNumber = Number(orderValue);
  if (Number.isFinite(asNumber)) return String(asNumber);
  return String(orderValue);
}

async function fetchLookupMap(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  tableCandidates: string[],
  ids: Array<string | number>,
  labelKeys: string[]
) {
  if (ids.length === 0) {
    return {} as Record<string, string>;
  }

  for (const table of tableCandidates) {
    const { data, error } = await supabase.from(table).select("*").in("id", ids);
    if (!error) {
      const map: Record<string, string> = {};
      (data ?? []).forEach((row) => {
        const record = row as Record<string, unknown>;
        const id = record.id;
        if (id === null || id === undefined) return;
        for (const key of labelKeys) {
          const label = record[key];
          if (label !== null && label !== undefined && label !== "") {
            map[String(id)] = String(label);
            return;
          }
        }
      });
      return map;
    }
  }

  return {} as Record<string, string>;
}

export default function HumorFlavorsTable({
  rows,
  hasError,
}: HumorFlavorsTableProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [localRows, setLocalRows] = useState(rows);
  const [selectedTheme, setSelectedTheme] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFlavor, setSelectedFlavor] = useState<HumorFlavorRow | null>(
    null
  );
  const [stepRows, setStepRows] = useState<HumorFlavorStepRow[]>([]);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [stepsError, setStepsError] = useState<string | null>(null);
  const [stepTypeMap, setStepTypeMap] = useState<Record<string, string>>({});
  const [stepModelMap, setStepModelMap] = useState<Record<string, string>>({});
  const [stepModelIdMap, setStepModelIdMap] = useState<Record<string, string>>(
    {}
  );
  const [inputTypeMap, setInputTypeMap] = useState<Record<string, string>>({});
  const [outputTypeMap, setOutputTypeMap] = useState<Record<string, string>>(
    {}
  );
  const [expandedPrompts, setExpandedPrompts] = useState<
    Record<string, { system: boolean; user: boolean }>
  >({});

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const themeOptions = useMemo(() => {
    const themes = new Set<string>();
    localRows.forEach((row) => {
      getFlavorThemes(row).forEach((theme) => themes.add(theme));
    });
    return Array.from(themes).sort((a, b) => a.localeCompare(b));
  }, [localRows]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return localRows.filter((row) => {
      if (selectedTheme !== "all") {
        const themes = getFlavorThemes(row);
        if (!themes.includes(selectedTheme)) return false;
      }
      if (!query) return true;
      const slug = String(pickValue(row, FLAVOR_SLUG_KEYS) ?? "").toLowerCase();
      const description = String(
        pickValue(row, FLAVOR_DESCRIPTION_KEYS) ?? ""
      ).toLowerCase();
      return slug.includes(query) || description.includes(query);
    });
  }, [localRows, searchQuery, selectedTheme]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const aId = pickValue(a, FLAVOR_ID_KEYS);
      const bId = pickValue(b, FLAVOR_ID_KEYS);
      if (typeof aId === "number" && typeof bId === "number") return bId - aId;
      return String(bId ?? "").localeCompare(String(aId ?? ""));
    });
  }, [filteredRows]);

  const sortedSteps = useMemo(() => {
    const orderKey = STEP_ORDER_KEYS.find((key) =>
      stepRows.some((row) => row[key] !== null && row[key] !== undefined)
    );
    if (!orderKey) return stepRows;
    return [...stepRows].sort((a, b) => {
      const aVal = a[orderKey];
      const bVal = b[orderKey];
      const aNum = typeof aVal === "number" ? aVal : Number(aVal);
      const bNum = typeof bVal === "number" ? bVal : Number(bVal);
      if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
      return String(aVal ?? "").localeCompare(String(bVal ?? ""));
    });
  }, [stepRows]);

  const closeDialog = () => {
    setSelectedFlavor(null);
    setStepRows([]);
    setStepsError(null);
    setStepsLoading(false);
    setStepTypeMap({});
    setStepModelMap({});
    setStepModelIdMap({});
    setInputTypeMap({});
    setOutputTypeMap({});
    setExpandedPrompts({});
  };

  const loadSteps = useCallback(
    async (flavor: HumorFlavorRow) => {
      const flavorId = pickValue(flavor, FLAVOR_ID_KEYS);
      if (flavorId === null || flavorId === undefined) {
        setStepRows([]);
        setStepsError("Missing flavor id.");
        return;
      }

      setStepsLoading(true);
      setStepsError(null);
      setStepRows([]);

      for (const tableName of STEP_TABLE_CANDIDATES) {
        for (const key of STEP_FLAVOR_ID_KEYS) {
          const { data, error } = await supabase
            .from(tableName)
            .select("*")
            .eq(key, flavorId);

          if (!error) {
            const resolvedSteps = (data ?? []) as HumorFlavorStepRow[];

            const stepTypeIds = Array.from(
              new Set(
                resolvedSteps
                  .map((step) => pickValue(step, STEP_TYPE_ID_KEYS))
                  .filter(
                    (value): value is string | number =>
                      value !== null && value !== undefined && value !== ""
                  )
              )
            );

            const modelIds = Array.from(
              new Set(
                resolvedSteps
                  .map((step) => pickValue(step, STEP_MODEL_ID_KEYS))
                  .filter(
                    (value): value is string | number =>
                      value !== null && value !== undefined && value !== ""
                  )
              )
            );

            const inputTypeIds = Array.from(
              new Set(
                resolvedSteps
                  .map((step) => pickValue(step, STEP_INPUT_TYPE_ID_KEYS))
                  .filter(
                    (value): value is string | number =>
                      value !== null && value !== undefined && value !== ""
                  )
              )
            );

            const outputTypeIds = Array.from(
              new Set(
                resolvedSteps
                  .map((step) => pickValue(step, STEP_OUTPUT_TYPE_ID_KEYS))
                  .filter(
                    (value): value is string | number =>
                      value !== null && value !== undefined && value !== ""
                  )
              )
            );

            const [stepTypes, modelNames, modelIdsMap, inputTypes, outputTypes] =
              await Promise.all([
                fetchLookupMap(
                  supabase,
                  [
                    "humor_flavor_step_types",
                    "humor_flavour_step_types",
                    "humor_step_types",
                  ],
                  stepTypeIds,
                  ["slug", "name", "title"]
                ),
                fetchLookupMap(
                  supabase,
                  ["llm_models", "llmodels", "llm_model"],
                  modelIds,
                  ["name", "model_name", "slug"]
                ),
                fetchLookupMap(
                  supabase,
                  ["llm_models", "llmodels", "llm_model"],
                  modelIds,
                  [
                    "provider_model_id",
                    "model_id",
                    "model_identifier",
                    "model_slug",
                    "model",
                  ]
                ),
                fetchLookupMap(
                  supabase,
                  ["llm_input_types", "llm_input_type"],
                  inputTypeIds,
                  ["slug", "name", "title"]
                ),
                fetchLookupMap(
                  supabase,
                  ["llm_output_types", "llm_output_type"],
                  outputTypeIds,
                  ["slug", "name", "title"]
                ),
              ]);

            setStepRows(resolvedSteps);
            setStepTypeMap(stepTypes);
            setStepModelMap(modelNames);
            setStepModelIdMap(modelIdsMap);
            setInputTypeMap(inputTypes);
            setOutputTypeMap(outputTypes);
            setStepsLoading(false);
            return;
          }
        }
      }

      setStepsError("Failed to load humor flavor steps.");
      setStepsLoading(false);
    },
    [supabase]
  );

  const handleSelectFlavor = useCallback(
    async (flavor: HumorFlavorRow) => {
      setSelectedFlavor(flavor);
      await loadSteps(flavor);
    },
    [loadSteps]
  );

  const togglePrompt = (stepKey: string, field: "system" | "user") => {
    setExpandedPrompts((prev) => {
      const existing = prev[stepKey] ?? { system: false, user: false };
      return {
        ...prev,
        [stepKey]: { ...existing, [field]: !existing[field] },
      };
    });
  };

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {hasError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          Failed to load humor flavors due to RLS policies.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px]">
          <select
            value={selectedTheme}
            onChange={(event) => setSelectedTheme(event.target.value)}
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-200"
          >
            <option value="all">All Themes</option>
            {themeOptions.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs text-zinc-400">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
            />
          </svg>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search flavors by slug or description..."
            className="w-full bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black/40">
        <div className="grid grid-cols-[0.5fr_1.2fr_2fr_1fr_0.9fr] gap-4 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <span>ID</span>
          <span>Slug</span>
          <span>Description</span>
          <span>Themes</span>
          <span>Actions</span>
        </div>
        <div className="divide-y divide-zinc-800/80">
          {sortedRows.length === 0 && (
            <div className="px-4 py-6 text-sm text-zinc-500">
              No humor flavors found.
            </div>
          )}
          {sortedRows.map((row, index) => {
            const flavorId = pickValue(row, FLAVOR_ID_KEYS);
            const rowKey = `${String(flavorId ?? "flavor")}-${index}`;
            const themes = getFlavorThemes(row);

            return (
              <div
                key={rowKey}
                role="button"
                tabIndex={0}
                onClick={() => void handleSelectFlavor(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleSelectFlavor(row);
                  }
                }}
                className="grid cursor-pointer grid-cols-[0.5fr_1.2fr_2fr_1fr_0.9fr] items-center gap-4 px-4 py-4 text-sm text-zinc-200 transition hover:bg-zinc-900/60"
              >
                <div className="text-sm text-zinc-100">
                  {formatCell(flavorId)}
                </div>
                <div className="text-sm font-semibold text-zinc-100">
                  {getFlavorLabel(row)}
                </div>
                <div className="text-xs text-zinc-400">
                  {getFlavorDescription(row)}
                </div>
                <div className="text-xs text-zinc-400">
                  {themes.length > 0 ? themes.join(", ") : "No themes"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleSelectFlavor(row);
                    }}
                    className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-blue-200"
                  >
                    Manage Steps
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedFlavor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-8"
          onClick={closeDialog}
        >
          <div
            className="h-[88vh] w-[96vw] max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Manage Steps for: {getFlavorLabel(selectedFlavor)}
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Adjust the pipeline order and configuration for this flavor.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-200"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="h-[calc(88vh-88px)] overflow-y-auto px-6 py-6">
              {stepsError && (
                <div className="mb-4 rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
                  {stepsError}
                </div>
              )}
              <div className="grid gap-6 lg:grid-cols-3">
                {stepsLoading && (
                  <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6 text-sm text-zinc-400">
                    Loading steps...
                  </div>
                )}
                {!stepsLoading && sortedSteps.length === 0 && (
                  <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6 text-sm text-zinc-400">
                    No steps found for this flavor.
                  </div>
                )}
                {sortedSteps.map((step, index) => {
                  const stepId = pickValue(step, STEP_ID_KEYS);
                  const stepKey = `${String(stepId ?? "step")}-${index}`;
                  const stepTypeId = pickValue(step, STEP_TYPE_ID_KEYS);
                  const stepType = pickValue(step, STEP_TYPE_KEYS);
                  const modelName = pickValue(step, STEP_MODEL_KEYS);
                  const modelId = pickValue(step, STEP_MODEL_ID_KEYS);
                  const inputTypeId = pickValue(step, STEP_INPUT_TYPE_ID_KEYS);
                  const outputTypeId = pickValue(step, STEP_OUTPUT_TYPE_ID_KEYS);
                  const inputType = pickValue(step, STEP_INPUT_KEYS);
                  const outputType = pickValue(step, STEP_OUTPUT_KEYS);
                  const systemPrompt = pickValue(step, STEP_SYSTEM_PROMPT_KEYS);
                  const userPrompt = pickValue(step, STEP_USER_PROMPT_KEYS);
                  const temperature = pickValue(step, STEP_TEMPERATURE_KEYS);
                  const promptState = expandedPrompts[stepKey] ?? {
                    system: false,
                    user: false,
                  };

                  return (
                    <div
                      key={stepKey}
                      className="rounded-2xl border border-zinc-800 bg-black/40 p-6 text-sm text-zinc-200"
                    >
                      <div className="text-2xl font-semibold text-white">
                        Step Number: {formatStepOrder(step, index)}
                      </div>
                      <div className="mt-4 grid gap-2 text-xs text-zinc-400">
                        <div className="flex items-center justify-between">
                          <span>Step ID</span>
                          <span className="text-zinc-200">
                            {formatCell(stepId)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>LLM Model</span>
                          <span className="text-zinc-200">
                            {modelId
                              ? formatCell(
                                  stepModelMap[String(modelId)] ?? modelName ?? modelId
                                )
                              : formatCell(modelName)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>LLM Model ID</span>
                          <span className="text-zinc-200">
                            {modelId
                              ? formatCell(stepModelIdMap[String(modelId)] ?? modelId)
                              : formatCell(modelId)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Step type</span>
                          <span className="text-zinc-200">
                            {stepTypeId
                              ? formatCell(
                                  stepTypeMap[String(stepTypeId)] ?? stepType ?? stepTypeId
                                )
                              : formatCell(stepType)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Input type</span>
                          <span className="text-zinc-200">
                            {inputTypeId
                              ? formatCell(
                                  inputTypeMap[String(inputTypeId)] ?? inputType ?? inputTypeId
                                )
                              : formatCell(inputType)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Output type</span>
                          <span className="text-zinc-200">
                            {outputTypeId
                              ? formatCell(
                                  outputTypeMap[String(outputTypeId)] ?? outputType ?? outputTypeId
                                )
                              : formatCell(outputType)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>System prompt</span>
                          <button
                            type="button"
                            onClick={() => togglePrompt(stepKey, "system")}
                            className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200"
                          >
                            {promptState.system ? "Hide" : "View"}
                          </button>
                        </div>
                        {promptState.system && (
                          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
                            {formatCell(systemPrompt)}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>User prompt</span>
                          <button
                            type="button"
                            onClick={() => togglePrompt(stepKey, "user")}
                            className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200"
                          >
                            {promptState.user ? "Hide" : "View"}
                          </button>
                        </div>
                        {promptState.user && (
                          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300">
                            {formatCell(userPrompt)}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>Temperature</span>
                          <span className="text-zinc-200">
                            {formatCell(temperature)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
