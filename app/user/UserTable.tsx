"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_superadmin: boolean | null;
  is_matrix_admin: boolean | null;
  created_datetime_utc: string | null;
  activity?: {
    images: number;
    captions: number;
  };
};

type UserTableProps = {
  initialProfiles: ProfileRow[];
  initialTotal: number;
  hasError: boolean;
};

type RoleFilter = "all" | "superadmin" | "matrixadmin" | "none";

type ApiResponse = {
  profiles: ProfileRow[];
  total: number;
  error?: string;
};

type ActivityPayload = {
  counts: {
    images: number;
    captions: number;
  };
  images: { id: string; url: string | null; created_datetime_utc: string }[];
  captions: {
    id: string;
    content: string | null;
    created_datetime_utc: string;
  }[];
  error?: string;
  warning?: string | null;
};

type ActivityView = "images" | "captions";

const ROLE_OPTIONS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "All Roles" },
  { key: "superadmin", label: "Super Admin" },
  { key: "matrixadmin", label: "Matrix Admin" },
  { key: "none", label: "No Role" },
];

const PAGE_SIZE = 50;

function getDisplayName(profile: ProfileRow) {
  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  return name.length > 0 ? name : "Anonymous User";
}

function formatSignupDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UserTable({
  initialProfiles,
  initialTotal,
  hasError,
}: UserTableProps) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [profiles, setProfiles] = useState<ProfileRow[]>(initialProfiles);
  const [totalUsers, setTotalUsers] = useState(initialTotal);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasError ? "Failed to load users due to RLS policies." : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [updatingRoles, setUpdatingRoles] = useState<Record<string, boolean>>(
    {}
  );
  const [activityProfileId, setActivityProfileId] = useState<string | null>(
    null
  );
  const [activityData, setActivityData] = useState<ActivityPayload | null>(
    null
  );
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activityView, setActivityView] = useState<ActivityView>("images");
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsRoleOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, roleFilter]);

  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    const controller = new AbortController();

    const fetchUsers = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams({
          page: String(currentPage),
          pageSize: String(PAGE_SIZE),
          role: roleFilter,
          q: query.trim(),
        });
        const response = await fetch(`/api/users?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as ApiResponse;

        if (!response.ok || payload.error) {
          throw new Error(payload.error || "Failed to load users");
        }

        setProfiles(payload.profiles ?? []);
        setTotalUsers(payload.total ?? 0);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setErrorMessage("Failed to load users due to RLS policies.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();

    return () => controller.abort();
  }, [currentPage, query, roleFilter]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));
  }, [totalUsers]);

  const safePage = Math.min(currentPage, totalPages);
  const startIndex = totalUsers === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(safePage * PAGE_SIZE, totalUsers);

  const activeRoleLabel =
    ROLE_OPTIONS.find((option) => option.key === roleFilter)?.label ??
    "All Roles";

  const updateRole = async (
    profile: ProfileRow,
    role: "is_superadmin" | "is_matrix_admin"
  ) => {
    const key = `${profile.id}:${role}`;
    setUpdatingRoles((prev) => ({ ...prev, [key]: true }));
    setErrorMessage(null);

    try {
      const nextValue = !profile[role];
      const response = await fetch(`/api/users/${profile.id}/roles`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [role]: nextValue }),
      });
      const payload = (await response.json()) as { profile?: ProfileRow };

      if (!response.ok || !payload.profile) {
        throw new Error("Failed to update role");
      }

      setProfiles((prev) =>
        prev.map((item) =>
          item.id === payload.profile?.id ? payload.profile : item
        )
      );
    } catch {
      setErrorMessage("Failed to update user role due to RLS policies.");
    } finally {
      setUpdatingRoles((prev) => ({ ...prev, [key]: false }));
    }
  };

  const openActivity = async (profile: ProfileRow, view: ActivityView) => {
    setIsActivityOpen(true);
    setIsActivityLoading(true);
    setActivityView(view);
    setActivityProfileId(profile.id);
    setActivityData(null);

    try {
      const response = await fetch(`/api/users/${profile.id}/activity`);
      const payload = (await response.json()) as ActivityPayload;
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Failed to load activity");
      }
      setActivityData(payload);
      setProfiles((prev) =>
        prev.map((item) =>
          item.id === profile.id
            ? {
                ...item,
                activity: {
                  images: payload.counts.images ?? 0,
                  captions: payload.counts.captions ?? 0,
                },
              }
            : item
        )
      );
    } catch {
      setActivityData({
        counts: { images: 0, captions: 0 },
        images: [],
        captions: [],
        error: "Failed to load activity due to RLS policies.",
      });
    } finally {
      setIsActivityLoading(false);
    }
  };

  const closeActivity = () => {
    setIsActivityOpen(false);
    setActivityProfileId(null);
    setActivityData(null);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-900/40 p-4 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap gap-3">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsRoleOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-200"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4 text-zinc-400"
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
            {activeRoleLabel}
            <span className="text-zinc-500">▾</span>
          </button>
          {isRoleOpen && (
            <div className="absolute left-0 top-12 z-20 w-44 space-y-1 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-xl">
              {ROLE_OPTIONS.map((option) => {
                const isActive = option.key === roleFilter;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setRoleFilter(option.key);
                      setIsRoleOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition ${
                      isActive
                        ? "bg-amber-300/90 text-zinc-900"
                        : "text-zinc-200 hover:bg-zinc-900"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{isActive ? "✓" : ""}</span>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex w-80 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
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
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users by name..."
            className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
          />
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="grid grid-cols-[1.6fr_1.6fr_1.6fr_1.2fr_1.2fr_1.6fr] gap-4 border-b border-zinc-800 bg-black/40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <span>User</span>
          <span>Email</span>
          <span>ID</span>
          <span>Activity</span>
          <span>Signup Date</span>
          <span>Roles</span>
        </div>
        <div className="max-h-[540px] divide-y divide-zinc-800/80 overflow-y-auto bg-black/20">
          {profiles.length === 0 && !isLoading && (
            <div className="px-4 py-6 text-sm text-zinc-500">
              No users match the current filters.
            </div>
          )}
          {profiles.map((profile) => {
            const name = getDisplayName(profile);

            return (
              <div
                key={profile.id}
                className="grid grid-cols-[1.6fr_1.6fr_1.6fr_1.2fr_1.2fr_1.6fr] gap-4 px-4 py-4 text-sm text-zinc-200"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-900 text-zinc-500">
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
                        d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 20.25a7.5 7.5 0 0 1 15 0"
                      />
                    </svg>
                  </div>
                  <span className="font-semibold text-zinc-100">{name}</span>
                </div>
                <div className="text-xs text-zinc-400">
                  {profile.email ?? "—"}
                </div>
                <div className="text-xs text-zinc-500">{profile.id}</div>
                <div className="flex items-center gap-4 text-xs text-zinc-400">
                  <button
                    type="button"
                    onClick={() => openActivity(profile, "images")}
                    className="inline-flex items-center gap-2 text-zinc-300 hover:text-white"
                  >
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
                        d="M4 6h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 10l2 2 4-4"
                      />
                    </svg>
                    {profile.activity?.images ?? 0}
                  </button>
                  <button
                    type="button"
                    onClick={() => openActivity(profile, "captions")}
                    className="inline-flex items-center gap-2 text-zinc-300 hover:text-white"
                  >
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
                        d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8l-3 3V8a2 2 0 0 1 2-2Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 11h6M9 14h4"
                      />
                    </svg>
                    {profile.activity?.captions ?? 0}
                  </button>
                </div>
                <div className="text-xs text-zinc-400">
                  {formatSignupDate(profile.created_datetime_utc)}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateRole(profile, "is_superadmin")}
                      disabled={updatingRoles[`${profile.id}:is_superadmin`]}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full border transition ${
                        profile.is_superadmin
                          ? "border-blue-400/60 bg-blue-500/60"
                          : "border-zinc-700 bg-zinc-900"
                      }`}
                      aria-pressed={Boolean(profile.is_superadmin)}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white/90 transition ${
                          profile.is_superadmin
                            ? "translate-x-5"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span>Super Admin</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateRole(profile, "is_matrix_admin")}
                      disabled={updatingRoles[`${profile.id}:is_matrix_admin`]}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full border transition ${
                        profile.is_matrix_admin
                          ? "border-blue-400/60 bg-blue-500/60"
                          : "border-zinc-700 bg-zinc-900"
                      }`}
                      aria-pressed={Boolean(profile.is_matrix_admin)}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white/90 transition ${
                          profile.is_matrix_admin
                            ? "translate-x-5"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span>Matrix Admin</span>
                  </div>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="px-4 py-6 text-sm text-zinc-500">
              Loading users...
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
        <span>
          Showing {startIndex} - {endIndex} of {totalUsers} users
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage === 1 || isLoading}
            onClick={() => setCurrentPage(1)}
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-400 disabled:opacity-50"
          >
            First
          </button>
          <button
            type="button"
            disabled={safePage === 1 || isLoading}
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
            disabled={safePage >= totalPages || isLoading}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-200 disabled:opacity-50"
          >
            Next
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages || isLoading}
            onClick={() => setCurrentPage(totalPages)}
            className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-200 disabled:opacity-50"
          >
            Last
          </button>
        </div>
      </div>

      {isActivityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 py-10">
          <div className="max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-200 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Activity
                </div>
                <div className="text-lg font-semibold text-white">
                  {activityView === "images"
                    ? "Images Uploaded"
                    : "Captions Created"}
                </div>
              </div>
              <button
                type="button"
                onClick={closeActivity}
                className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
              >
                Close
              </button>
            </div>

            {isActivityLoading && (
              <div className="mt-6 text-sm text-zinc-400">
                Loading activity...
              </div>
            )}

            {activityData?.error && (
              <div className="mt-6 rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
                {activityData.error}
              </div>
            )}

            {activityData?.warning && !activityData.error && (
              <div className="mt-6 rounded-xl border border-amber-900/40 bg-amber-950/40 p-3 text-xs text-amber-200">
                Some activity data could not be loaded due to RLS policies.
              </div>
            )}

            {activityData && !activityData.error && (
              <div className="mt-6 space-y-6">
                {activityView === "images" && (
                  <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Images Uploaded
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {activityData.counts.images}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {activityData.images.length === 0 && (
                        <div className="col-span-full text-xs text-zinc-500">
                          No images found.
                        </div>
                      )}
                      {activityData.images.map((image) => (
                        <div
                          key={image.id}
                          className="aspect-square rounded-2xl border border-zinc-800 bg-zinc-900 p-2"
                        >
                          <div className="h-full w-full overflow-hidden rounded-xl bg-zinc-950">
                            {image.url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={image.url}
                                alt="User upload"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                                No image
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activityView === "captions" && (
                  <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Captions Created
                    </div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {activityData.counts.captions}
                    </div>
                    <div className="mt-4 space-y-3">
                      {activityData.captions.length === 0 && (
                        <div className="text-xs text-zinc-500">
                          No captions found.
                        </div>
                      )}
                      {activityData.captions.map((caption) => (
                        <div
                          key={caption.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-200"
                        >
                          {caption.content || "Untitled caption"}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
