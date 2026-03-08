"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LlmPromptChainRow = Record<string, unknown>;

type CaptionRow = Record<string, unknown> & {
  images?: { url: string | null } | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
};

type LlmModelResponseRow = Record<string, unknown>;

type HumorFlavorStepRow = Record<string, unknown>;

type LlmPromptChainsTableProps = {
  rows: LlmPromptChainRow[];
  hasError: boolean;
};

const PAGE_SIZE = 50;
const ID_KEYS = ["id", "prompt_chain_id", "uuid"];
const CREATED_KEYS = [
  "created_datetime_utc",
  "created_at",
  "created_on",
  "timestamp",
];
const CAPTION_REQUEST_KEYS = [
  "caption_request_id",
  "caption_request",
  "caption_request_uuid",
  "caption_request_fk",
];
const STEP_ORDER_KEYS = ["order_by", "order", "step_order", "step_index", "position"];
const STEP_TYPE_ID_KEYS = [
  "humor_step_type_id",
  "humor_flavor_step_type_id",
  "humor_flavour_step_type_id",
  "step_type_id",
];
const STEP_MODEL_ID_KEYS = ["model_id", "llm_model_id"];
const STEP_INPUT_TYPE_ID_KEYS = ["llm_input_type_id", "input_type_id", "input_type"];
const STEP_OUTPUT_TYPE_ID_KEYS = ["llm_output_type_id", "output_type_id", "output_type"];
const STEP_INPUT_KEYS = ["input", "input_tokens", "input_count", "input_token_count"];
const STEP_OUTPUT_KEYS = ["output", "output_tokens", "output_count", "output_token_count"];
const RESPONSE_KEYS = [
  "response",
  "output_text",
  "completion",
  "content",
  "assistant_message",
  "text",
  "result",
];
const RESPONSE_ID_KEYS = ["id", "response_id", "uuid"];
const RESPONSE_MODEL_KEYS = ["model", "model_name", "model_id", "llm_model_id"];
const RESPONSE_PROFILE_KEYS = ["profile_id", "profile", "profile_uuid"];
const RESPONSE_FLAVOR_KEYS = [
  "flavor_id",
  "humor_flavor_id",
  "humour_flavour_id",
  "flavor",
  "humor_flavor",
  "humor_flavour",
  "humour_flavor",
  "humour_flavour",
];
const RESPONSE_STEP_ID_KEYS = [
  "humor_flavor_step_id",
  "humour_flavour_step_id",
  "flavor_step_id",
  "humor_flavor_step",
];
const RESPONSE_TEMP_KEYS = [
  "temp",
  "temperature",
  "sampling_temperature",
  "sampling_temp",
  "response_temperature",
  "model_temperature",
  "llm_temp",
  "llm_temperature",
];
const RESPONSE_PROCESSING_KEYS = [
  "processing",
  "processing_time",
  "processing_time_ms",
  "processing_time_seconds",
  "processing_ms",
  "processing_seconds",
  "processing_secs",
  "latency",
  "latency_ms",
  "duration",
  "duration_ms",
  "processing_duration_ms",
  "elapsed",
  "elapsed_ms",
];
const CAPTION_PUBLIC_KEYS = ["is_public", "public"];
const CAPTION_FEATURED_KEYS = ["is_featured", "featured"];
const CAPTION_LIKE_KEYS = ["like_count", "likes", "like"];

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function pickValue(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

function pickValueWithKey(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== "") {
      return { key, value };
    }
  }
  return null;
}

function shortId(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  if (text.length <= 6) return text;
  return `${text.slice(0, 3)}...`;
}

function truncate(value: string, max = 80) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

function findCreatedKey(rows: LlmPromptChainRow[]) {
  return CREATED_KEYS.find((key) => rows.some((row) => row[key] != null)) ?? null;
}

function sortByCreated<T extends Record<string, unknown>>(
  rows: T[],
  key: string | null
) {
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    const aTime = typeof aVal === "string" ? new Date(aVal).getTime() : 0;
    const bTime = typeof bVal === "string" ? new Date(bVal).getTime() : 0;
    return bTime - aTime;
  });
}

function getProfileLabel(profile: CaptionRow["profiles"]) {
  if (!profile) return "—";
  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  if (name.length > 0) return name;
  return profile.email ?? "—";
}

function formatBoolean(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value === 1 ? "Yes" : "No";
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return "Yes";
    if (value.toLowerCase() === "false") return "No";
  }
  return "—";
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

function formatProcessing(
  entry: { key: string; value: unknown } | null
): string {
  if (!entry) return "—";
  const { key, value } = entry;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "—";
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const isMs = key.toLowerCase().includes("ms");
      if (isMs) return `${Math.round(numeric / 10) / 100}s`;
      return `${Math.round(numeric * 100) / 100}s`;
    }
    return trimmed;
  }

  if (typeof value === "number") {
    const isMs = key.toLowerCase().includes("ms");
    if (isMs || value >= 1000) {
      return `${Math.round(value / 10) / 100}s`;
    }
    return `${Math.round(value * 100) / 100}s`;
  }

  return String(value);
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

async function fetchCaptionsForChain(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  promptChainId: unknown,
  captionRequestId: unknown
) {
  if (!promptChainId && !captionRequestId) {
    return { data: [] as CaptionRow[], error: null as string | null };
  }

  const baseSelect =
    "*, images ( url ), profiles ( first_name, last_name, email )";
  const filterSets: string[][] = [];

  if (captionRequestId && promptChainId) {
    filterSets.push(
      [`caption_request_id.eq.${captionRequestId}`, `prompt_chain_id.eq.${promptChainId}`],
      [`caption_request.eq.${captionRequestId}`, `prompt_chain_id.eq.${promptChainId}`]
    );
  }
  if (captionRequestId) {
    filterSets.push([`caption_request_id.eq.${captionRequestId}`]);
    filterSets.push([`caption_request.eq.${captionRequestId}`]);
  }
  if (promptChainId) {
    filterSets.push([`prompt_chain_id.eq.${promptChainId}`]);
  }

  for (const filters of filterSets) {
    const result = await supabase
      .from("captions")
      .select(baseSelect)
      .or(filters.join(","));
    if (!result.error) {
      return { data: (result.data ?? []) as CaptionRow[], error: null };
    }
  }

  return { data: [] as CaptionRow[], error: "Failed to load captions." };
}

async function fetchResponsesForChain(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  promptChainId: unknown,
  captionRequestId: unknown
) {
  if (!promptChainId && !captionRequestId) {
    return { data: [] as LlmModelResponseRow[], error: null as string | null };
  }

  const filterSets: string[][] = [];

  if (captionRequestId && promptChainId) {
    filterSets.push(
      [`caption_request_id.eq.${captionRequestId}`, `prompt_chain_id.eq.${promptChainId}`],
      [`caption_request.eq.${captionRequestId}`, `prompt_chain_id.eq.${promptChainId}`]
    );
  }
  if (captionRequestId) {
    filterSets.push([`caption_request_id.eq.${captionRequestId}`]);
    filterSets.push([`caption_request.eq.${captionRequestId}`]);
  }
  if (promptChainId) {
    filterSets.push([`prompt_chain_id.eq.${promptChainId}`]);
  }

  for (const filters of filterSets) {
    const result = await supabase
      .from("llm_model_responses")
      .select("*")
      .or(filters.join(","));
    if (!result.error) {
      return { data: (result.data ?? []) as LlmModelResponseRow[], error: null };
    }
  }

  return {
    data: [] as LlmModelResponseRow[],
    error: "Failed to load LLM responses.",
  };
}

async function fetchFlavorStepsByIds(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  stepIds: Array<string | number>
) {
  if (stepIds.length === 0) {
    return { data: [] as HumorFlavorStepRow[], error: null as string | null };
  }

  const tableCandidates = [
    "humor_flavor_steps",
    "llm_humor_flavor_steps",
    "humor_flavour_steps",
  ];

  for (const table of tableCandidates) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .in("id", stepIds);

    if (!error) {
      return { data: (data ?? []) as HumorFlavorStepRow[], error: null };
    }
  }

  return {
    data: [] as HumorFlavorStepRow[],
    error: "Failed to load humor flavor steps.",
  };
}

export default function LlmPromptChainsTable({
  rows,
  hasError,
}: LlmPromptChainsTableProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState<LlmPromptChainRow | null>(null);
  const [localRows, setLocalRows] = useState(rows);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [captionRows, setCaptionRows] = useState<CaptionRow[]>([]);
  const [responseRows, setResponseRows] = useState<LlmModelResponseRow[]>([]);
  const [stepRows, setStepRows] = useState<HumorFlavorStepRow[]>([]);
  const [stepTypeMap, setStepTypeMap] = useState<Record<string, string>>({});
  const [stepModelMap, setStepModelMap] = useState<Record<string, string>>({});
  const [inputTypeMap, setInputTypeMap] = useState<Record<string, string>>({});
  const [outputTypeMap, setOutputTypeMap] = useState<Record<string, string>>({});
  const [selectedResponse, setSelectedResponse] =
    useState<LlmModelResponseRow | null>(null);

  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  useEffect(() => {
    if (!selectedRow) {
      setDetailLoading(false);
      setDetailError(null);
      setCaptionRows([]);
      setResponseRows([]);
      setStepRows([]);
      setStepTypeMap({});
      setStepModelMap({});
      setInputTypeMap({});
      setOutputTypeMap({});
      setSelectedResponse(null);
      return;
    }

    let isActive = true;

    const loadDetails = async () => {
      setDetailLoading(true);
      setDetailError(null);

      const promptChainId = pickValue(selectedRow, ID_KEYS);
      const captionRequestId = pickValue(selectedRow, CAPTION_REQUEST_KEYS);

      let errorMessage: string | null = null;

      const captionResult = await fetchCaptionsForChain(
        supabase,
        promptChainId,
        captionRequestId
      );
      if (captionResult.error) errorMessage = captionResult.error;

      const responseResult = await fetchResponsesForChain(
        supabase,
        promptChainId,
        captionRequestId
      );
      if (!errorMessage && responseResult.error)
        errorMessage = responseResult.error;

      const stepIds = Array.from(
        new Set(
          responseResult.data
            .map((response) => pickValue(response, RESPONSE_STEP_ID_KEYS))
            .filter((value): value is string | number =>
              value !== null && value !== undefined && value !== ""
            )
        )
      );

      const stepResult = await fetchFlavorStepsByIds(supabase, stepIds);
      if (!errorMessage && stepResult.error) errorMessage = stepResult.error;

      const stepTypeIds = Array.from(
        new Set(
          stepResult.data
            .map((step) => pickValue(step, STEP_TYPE_ID_KEYS))
            .filter((value): value is string | number =>
              value !== null && value !== undefined && value !== ""
            )
        )
      );

      const modelIds = Array.from(
        new Set(
          stepResult.data
            .map((step) => pickValue(step, STEP_MODEL_ID_KEYS))
            .filter((value): value is string | number =>
              value !== null && value !== undefined && value !== ""
            )
        )
      );

      const inputTypeIds = Array.from(
        new Set(
          stepResult.data
            .map((step) => pickValue(step, STEP_INPUT_TYPE_ID_KEYS))
            .filter((value): value is string | number =>
              value !== null && value !== undefined && value !== ""
            )
        )
      );

      const outputTypeIds = Array.from(
        new Set(
          stepResult.data
            .map((step) => pickValue(step, STEP_OUTPUT_TYPE_ID_KEYS))
            .filter((value): value is string | number =>
              value !== null && value !== undefined && value !== ""
            )
        )
      );

      const [stepTypes, modelNames, inputTypes, outputTypes] = await Promise.all(
        [
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
        ]
      );

      if (!isActive) return;

      setCaptionRows(captionResult.data);
      setResponseRows(responseResult.data);
      setStepRows(stepResult.data);
      setStepTypeMap(stepTypes);
      setStepModelMap(modelNames);
      setInputTypeMap(inputTypes);
      setOutputTypeMap(outputTypes);
      setDetailLoading(false);
      setDetailError(errorMessage);
    };

    loadDetails();

    return () => {
      isActive = false;
    };
  }, [selectedRow, supabase]);

  const createdKey = useMemo(() => findCreatedKey(localRows), [localRows]);
  const sortedRows = useMemo(
    () => sortByCreated(localRows, createdKey),
    [localRows, createdKey]
  );

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedRows;
    return sortedRows.filter((row) => {
      const idValue = pickValue(row, ID_KEYS);
      const captionRequestValue = pickValue(row, CAPTION_REQUEST_KEYS);
      return (
        String(idValue ?? "").toLowerCase().includes(q) ||
        String(captionRequestValue ?? "").toLowerCase().includes(q)
      );
    });
  }, [sortedRows, searchQuery]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  }, [filteredRows.length]);

  const safePage = Math.min(currentPage, totalPages);
  const startIndex =
    filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, filteredRows.length);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const sortedSteps = useMemo(() => {
    if (stepRows.length === 0) return stepRows;
    return [...stepRows].sort((a, b) => {
      const aOrder = Number(pickValue(a, STEP_ORDER_KEYS) ?? 0);
      const bOrder = Number(pickValue(b, STEP_ORDER_KEYS) ?? 0);
      return aOrder - bOrder;
    });
  }, [stepRows]);

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-900/40 p-4 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      {hasError && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          Failed to load prompt chains. Check table permissions or schema.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full max-w-xl items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 4.5a5.5 5.5 0 1 0 3.6 9.6l4.2 4.2 1.7-1.7-4.2-4.2A5.5 5.5 0 0 0 10 4.5Z"
            />
          </svg>
          <input
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by prompt chain ID or caption request ID"
            className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="grid grid-cols-[0.6fr_1fr_1fr] gap-4 border-b border-zinc-800 bg-black/40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <span>ID</span>
          <span>Created</span>
          <span>Caption Request</span>
        </div>
        <div className="max-h-[620px] divide-y divide-zinc-800/80 overflow-y-auto bg-black/20">
          {pageRows.length === 0 && !hasError && (
            <div className="px-4 py-6 text-sm text-zinc-500">
              No prompt chains found.
            </div>
          )}
          {pageRows.map((row, index) => {
            const idValue = pickValue(row, ID_KEYS);
            const createdValue =
              createdKey && row[createdKey] ? row[createdKey] : null;
            const captionRequestValue = pickValue(row, CAPTION_REQUEST_KEYS);
            const rowKey = `${String(idValue ?? "row")}-${startIndex + index}`;

            return (
              <div
                key={rowKey}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRow(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedRow(row);
                  }
                }}
                className="grid cursor-pointer grid-cols-[0.6fr_1fr_1fr] gap-4 px-4 py-4 text-sm text-zinc-200 transition hover:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
              >
                <div className="text-sm text-zinc-100">
                  {shortId(idValue)}
                </div>
                <div className="text-xs text-zinc-400">
                  {typeof createdValue === "string"
                    ? formatTimestamp(createdValue)
                    : "—"}
                </div>
                <div className="text-xs text-zinc-400">
                  {formatCellValue(captionRequestValue)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
        <span>
          Showing {startIndex} - {endIndex} of {filteredRows.length} chains
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setCurrentPage(1)}
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-400 disabled:opacity-50"
          >
            First
          </button>
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-400 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-200">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-200 disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-200 disabled:opacity-50"
          >
            Last
          </button>
        </div>
      </div>

      {selectedRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-8"
          onClick={() => setSelectedRow(null)}
        >
          <div
            className="h-[88vh] w-[96vw] max-w-6xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Prompt Chain
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatCellValue(pickValue(selectedRow, ID_KEYS))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-200"
              >
                Back to Table
              </button>
            </div>

            <div className="h-[calc(88vh-88px)] overflow-y-auto px-6 py-6">
                <div className="space-y-6">
                  {detailError && (
                    <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
                      {detailError}
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-zinc-100">
                            Prompt Chain Details
                          </div>
                          <div className="text-xs text-zinc-500">
                            Chain metadata and source request.
                          </div>
                        </div>
                        {pickValue(selectedRow, CAPTION_REQUEST_KEYS) ? (
                          <a
                            href={`/captions/requests?search=${encodeURIComponent(
                              String(
                                pickValue(selectedRow, CAPTION_REQUEST_KEYS)
                              )
                            )}`}
                            className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-200"
                          >
                            View Caption Request
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-500"
                          >
                            View Caption Request
                          </button>
                        )}
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-zinc-300">
                        <div className="grid grid-cols-[160px_1fr] gap-4">
                          <span className="text-zinc-500">Prompt Chain ID</span>
                          <span className="text-zinc-100">
                            {formatCellValue(pickValue(selectedRow, ID_KEYS))}
                          </span>
                        </div>
                        <div className="grid grid-cols-[160px_1fr] gap-4">
                          <span className="text-zinc-500">Created</span>
                          <span className="text-zinc-100">
                            {(() => {
                              const createdValue = pickValue(
                                selectedRow,
                                CREATED_KEYS
                              );
                              return typeof createdValue === "string"
                                ? formatTimestamp(createdValue)
                                : "—";
                            })()}
                          </span>
                        </div>
                        <div className="grid grid-cols-[160px_1fr] gap-4">
                          <span className="text-zinc-500">
                            Caption Request ID
                          </span>
                          <span className="text-zinc-100">
                            {formatCellValue(
                              pickValue(selectedRow, CAPTION_REQUEST_KEYS)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                      <div className="text-lg font-semibold text-zinc-100">
                        Generated Output
                      </div>
                      <div className="text-xs text-zinc-500">
                        Totals for this chain run.
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                          <div className="text-xs uppercase tracking-wider text-zinc-500">
                            Captions
                          </div>
                          <div className="mt-2 text-3xl font-semibold text-white">
                            {detailLoading ? "—" : captionRows.length}
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                          <div className="text-xs uppercase tracking-wider text-zinc-500">
                            LLM Responses
                          </div>
                          <div className="mt-2 text-3xl font-semibold text-white">
                            {detailLoading ? "—" : responseRows.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black/40">
                  <div className="border-b border-zinc-800 px-4 py-3">
                    <div className="text-sm font-semibold text-zinc-100">
                      Humor Flavor Steps
                    </div>
                    <div className="text-xs text-zinc-500">
                      {detailLoading
                        ? "Loading steps..."
                        : `${sortedSteps.length} steps ran for this prompt chain.`}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[760px]">
                      <div className="grid grid-cols-[0.6fr_0.6fr_1fr_1.4fr_0.8fr_0.8fr] gap-4 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <span>ID</span>
                        <span>Order</span>
                        <span>Step Type</span>
                        <span>Model</span>
                        <span>Input</span>
                        <span>Output</span>
                      </div>
                      <div className="divide-y divide-zinc-800/80">
                        {sortedSteps.length === 0 && !detailLoading && (
                          <div className="px-4 py-6 text-sm text-zinc-500">
                            No steps found for this prompt chain.
                          </div>
                        )}
                        {sortedSteps.map((step, index) => {
                          const idValue = pickValue(step, ["id", "step_id"]);
                          const rowKey = `${String(idValue ?? "step")}-${index}`;
                          const stepTypeId = pickValue(step, STEP_TYPE_ID_KEYS);
                          const modelId = pickValue(step, STEP_MODEL_ID_KEYS);
                          const inputTypeId = pickValue(
                            step,
                            STEP_INPUT_TYPE_ID_KEYS
                          );
                          const outputTypeId = pickValue(
                            step,
                            STEP_OUTPUT_TYPE_ID_KEYS
                          );

                          return (
                            <div
                              key={rowKey}
                              className="grid grid-cols-[0.6fr_0.6fr_1fr_1.4fr_0.8fr_0.8fr] gap-4 px-4 py-4 text-sm text-zinc-200"
                            >
                              <div className="text-sm text-zinc-100">
                                {shortId(idValue)}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {formatCellValue(
                                  pickValue(step, STEP_ORDER_KEYS)
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {stepTypeId
                                  ? stepTypeMap[String(stepTypeId)] ??
                                    stepTypeId
                                  : "—"}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {modelId
                                  ? stepModelMap[String(modelId)] ?? modelId
                                  : "—"}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {inputTypeId
                                  ? formatCellValue(
                                      inputTypeMap[String(inputTypeId)] ??
                                        inputTypeId
                                    )
                                  : formatCellValue(
                                      pickValue(step, STEP_INPUT_KEYS)
                                    )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {outputTypeId
                                  ? formatCellValue(
                                      outputTypeMap[String(outputTypeId)] ??
                                        outputTypeId
                                    )
                                  : formatCellValue(
                                      pickValue(step, STEP_OUTPUT_KEYS)
                                    )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black/40">
                  <div className="border-b border-zinc-800 px-4 py-3">
                    <div className="text-sm font-semibold text-zinc-100">
                      Captions
                    </div>
                    <div className="text-xs text-zinc-500">
                      {detailLoading
                        ? "Loading captions..."
                        : `${captionRows.length} captions generated from this prompt chain.`}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[1100px]">
                      <div className="grid grid-cols-[0.6fr_1fr_2fr_1fr_1fr_0.6fr_0.7fr_0.6fr] gap-4 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <span>ID</span>
                        <span>Created</span>
                        <span>Content</span>
                        <span>Image</span>
                        <span>Profile</span>
                        <span>Public</span>
                        <span>Featured</span>
                        <span>Likes</span>
                      </div>
                      <div className="divide-y divide-zinc-800/80">
                        {captionRows.length === 0 && !detailLoading && (
                          <div className="px-4 py-6 text-sm text-zinc-500">
                            No captions found for this prompt chain.
                          </div>
                        )}
                        {captionRows.map((caption, index) => {
                          const idValue = pickValue(caption, ["id"]);
                          const rowKey = `${String(idValue ?? "caption")}-${index}`;
                          const createdValue = pickValue(caption, CREATED_KEYS);
                          const imageUrl = caption.images?.url ?? null;
                          const profileLabel = getProfileLabel(caption.profiles);
                          const contentValue = pickValue(caption, ["content"]);

                          return (
                            <div
                              key={rowKey}
                              className="grid grid-cols-[0.6fr_1fr_2fr_1fr_1fr_0.6fr_0.7fr_0.6fr] gap-4 px-4 py-4 text-sm text-zinc-200"
                            >
                              <div className="text-sm text-zinc-100">
                                {shortId(idValue)}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {typeof createdValue === "string"
                                  ? formatTimestamp(createdValue)
                                  : "—"}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {contentValue
                                  ? truncate(String(contentValue), 120)
                                  : "—"}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {imageUrl ? (
                                  <a
                                    href={imageUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-zinc-200 underline decoration-dotted underline-offset-2"
                                  >
                                    View
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {profileLabel}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {formatBoolean(
                                  pickValue(caption, CAPTION_PUBLIC_KEYS)
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {formatBoolean(
                                  pickValue(caption, CAPTION_FEATURED_KEYS)
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {formatCellValue(
                                  pickValue(caption, CAPTION_LIKE_KEYS)
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black/40">
                  <div className="border-b border-zinc-800 px-4 py-3">
                    <div className="text-sm font-semibold text-zinc-100">
                      LLM Responses
                    </div>
                    <div className="text-xs text-zinc-500">
                      {detailLoading
                        ? "Loading responses..."
                        : `${responseRows.length} model responses tied to this chain.`}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[1200px]">
                      <div className="grid grid-cols-[0.6fr_1fr_0.8fr_0.9fr_1fr_0.8fr_0.6fr_0.9fr_2fr] gap-4 border-b border-zinc-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        <span>ID</span>
                        <span>Created</span>
                        <span>Model</span>
                        <span>Caption Req</span>
                        <span>Profile</span>
                        <span>Flavor</span>
                        <span>Temp</span>
                        <span>Processing</span>
                        <span>Response</span>
                      </div>
                      <div className="divide-y divide-zinc-800/80">
                        {responseRows.length === 0 && !detailLoading && (
                          <div className="px-4 py-6 text-sm text-zinc-500">
                            No responses found for this prompt chain.
                          </div>
                        )}
                        {responseRows.map((response, index) => {
                          const idValue = pickValue(response, RESPONSE_ID_KEYS);
                          const rowKey = `${String(idValue ?? "response")}-${index}`;
                          const createdValue = pickValue(response, CREATED_KEYS);
                          const processingEntry = pickValueWithKey(
                            response,
                            RESPONSE_PROCESSING_KEYS
                          );

                          return (
                            <div
                              key={rowKey}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedResponse(response)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedResponse(response);
                                }
                              }}
                              className="grid cursor-pointer grid-cols-[0.6fr_1fr_0.8fr_0.9fr_1fr_0.8fr_0.6fr_0.9fr_2fr] gap-4 px-4 py-4 text-sm text-zinc-200 transition hover:bg-zinc-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                            >
                              <div className="text-sm text-zinc-100">
                                {shortId(idValue)}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {typeof createdValue === "string"
                                  ? formatTimestamp(createdValue)
                                  : "—"}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {formatCellValue(
                                  pickValue(response, RESPONSE_MODEL_KEYS)
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {formatCellValue(
                                  pickValue(response, CAPTION_REQUEST_KEYS)
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {shortId(
                                  pickValue(response, RESPONSE_PROFILE_KEYS)
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {formatCellValue(
                                  pickValue(response, RESPONSE_FLAVOR_KEYS)
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {formatCellValue(
                                  pickValue(response, RESPONSE_TEMP_KEYS)
                                )}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {formatProcessing(processingEntry)}
                              </div>
                              <div className="text-xs text-zinc-400">
                                {(() => {
                                  const responseValue = pickValue(
                                    response,
                                    RESPONSE_KEYS
                                  );
                                  if (responseValue === null || responseValue === undefined)
                                    return "—";
                                  if (typeof responseValue === "string") {
                                    return truncate(responseValue, 120);
                                  }
                                  return truncate(
                                    JSON.stringify(responseValue),
                                    120
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedResponse && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 px-6 py-8"
          onClick={() => setSelectedResponse(null)}
        >
          <div
            className="h-[88vh] w-[96vw] max-w-5xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  LLM Response
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {formatCellValue(
                    pickValue(selectedResponse, RESPONSE_ID_KEYS)
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResponse(null)}
                className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-200"
              >
                Back to Responses
              </button>
            </div>

            <div className="h-[calc(88vh-88px)] overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Response
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">
                    {(() => {
                      const responseValue = pickValue(
                        selectedResponse,
                        RESPONSE_KEYS
                      );
                      if (responseValue === null || responseValue === undefined)
                        return "—";
                      return typeof responseValue === "string"
                        ? responseValue
                        : JSON.stringify(responseValue, null, 2);
                    })()}
                  </div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Raw JSON
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-xs text-zinc-300">
                    {JSON.stringify(selectedResponse, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
