"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import SidebarNav from "@/app/components/SidebarNav";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export const dynamic = "force-dynamic";

type ImageRow = {
  id: string;
  url: string | null;
  created_datetime_utc: string | null;
  additional_context?: string | null;
  image_description?: string | null;
  celebrity_recognition?: string | null;
  profile_id?: string | null;
  is_common_use?: boolean | null;
  is_public?: boolean | null;
  category_id?: string | null;
  uploader_name?: string | null;
  uploader_email?: string | null;
};

type CaptionRow = {
  id: string;
  content: string | null;
  created_datetime_utc: string | null;
};

const ITEMS_PER_PAGE = 8;

type SortOrder = "recent" | "oldest";

function normalizeImage(row: Record<string, any>): ImageRow {
  const id = row?.id ? String(row.id) : "";
  const url = row?.url ?? row?.image_url ?? null;
  const created = row?.created_datetime_utc ?? row?.created_at ?? null;
  const additional = row?.additional_context ?? null;
  const description = row?.image_description ?? row?.description ?? null;
  const celebrity = row?.celebrity_recognition ?? row?.celebrity ?? null;
  const profileId = row?.profile_id ?? null;
  const isCommon =
    typeof row?.is_common_use === "boolean" ? row.is_common_use : null;
  const isPublic =
    typeof row?.is_public === "boolean"
      ? row.is_public
      : typeof row?.is_publicly_visible === "boolean"
        ? row.is_publicly_visible
        : null;
  const categoryRaw =
    row?.common_use_category_id ?? row?.category_id ?? row?.category ?? null;
  const categoryId = categoryRaw ? String(categoryRaw) : null;

  return {
    id,
    url,
    created_datetime_utc: created,
    additional_context: additional,
    image_description: description,
    celebrity_recognition: celebrity,
    profile_id: profileId,
    is_common_use: isCommon,
    is_public: isPublic,
    category_id: categoryId,
  };
}

function formatTimestamp(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type ImageTileProps = {
  image: ImageRow;
  onSelect: (image: ImageRow) => void;
};

function ImageTile({ image, onSelect }: ImageTileProps) {
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleRetry = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setHasError(false);
    setReloadKey((key) => key + 1);
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(image)}
      className="group relative h-full w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-left shadow-[0_12px_28px_rgba(0,0,0,0.35)] transition hover:border-zinc-600"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900/60 to-black/30" />
      <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
        {!image.url ? (
          <div className="text-xs text-zinc-500">No image</div>
        ) : hasError ? (
          <div className="flex flex-col items-center gap-2 text-xs text-red-300">
            <span>Failed to load</span>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-full border border-red-700/60 bg-red-900/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-red-200"
            >
              Retry
            </button>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={reloadKey}
            src={image.url}
            alt="Image preview"
            className="h-full w-full rounded-xl object-contain"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
      </div>
      <div className="absolute inset-x-3 bottom-3 z-20 rounded-full border border-zinc-700/60 bg-black/70 px-3 py-1 text-[10px] text-zinc-200">
        {formatTimestamp(image.created_datetime_utc)}
      </div>
    </button>
  );
}

type ToggleProps = {
  enabled: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

function VisibilityToggle({ enabled, disabled, onToggle }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={classNames(
        "relative inline-flex h-5 w-10 items-center rounded-full border transition",
        enabled
          ? "border-amber-300/70 bg-amber-300/80"
          : "border-zinc-700 bg-zinc-900",
        disabled ? "opacity-60" : ""
      )}
      aria-pressed={enabled}
    >
      <span
        className={classNames(
          "inline-block h-4 w-4 transform rounded-full bg-white/90 transition",
          enabled ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}

export default function ImagesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [displayName, setDisplayName] = useState("Account");

  const [images, setImages] = useState<ImageRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [imageIdQuery, setImageIdQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");

  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageRow | null>(null);
  const [captions, setCaptions] = useState<CaptionRow[]>([]);
  const [draftDescription, setDraftDescription] = useState("");
  const [draftCelebrity, setDraftCelebrity] = useState("");
  const [draftContext, setDraftContext] = useState("");
  const [saveStatus, setSaveStatus] = useState<{
    description: string | null;
    celebrity: string | null;
    context: string | null;
    visibility: string | null;
  }>({
    description: null,
    celebrity: null,
    context: null,
    visibility: null,
  });
  const [isSavingField, setIsSavingField] = useState<{
    description: boolean;
    celebrity: boolean;
    context: boolean;
    visibility: boolean;
  }>({
    description: false,
    celebrity: false,
    context: false,
    visibility: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      const email = data.user?.email ?? "";
      const name = data.user?.user_metadata?.full_name ?? "";
      setDisplayName(name || email || "Account");
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase.from("images").select("*");

    if (error) {
      setImages([]);
      setErrorMessage("Failed to load images due to RLS policies.");
      setIsLoading(false);
      return;
    }

    const normalized = (data ?? [])
      .map((row) => normalizeImage(row as Record<string, any>))
      .filter((image) => image.id.length > 0)
      .sort((a, b) => {
        const aTime = a.created_datetime_utc
          ? new Date(a.created_datetime_utc).getTime()
          : 0;
        const bTime = b.created_datetime_utc
          ? new Date(b.created_datetime_utc).getTime()
          : 0;
        return bTime - aTime;
      });

    setImages(normalized);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    startTransition(() => {
      fetchImages();
    });
  }, [fetchImages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortOrder, debouncedQuery]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(imageIdQuery.trim()),
      200
    );
    return () => clearTimeout(timer);
  }, [imageIdQuery]);

  useEffect(() => {
    setDraftDescription(selectedImage?.image_description ?? "");
    setDraftCelebrity(selectedImage?.celebrity_recognition ?? "");
    setDraftContext(selectedImage?.additional_context ?? "");
    setSaveStatus({
      description: null,
      celebrity: null,
      context: null,
      visibility: null,
    });
  }, [selectedImage]);

  useEffect(() => {
    if (!imageDialogOpen) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImageDialogOpen(false);
        setSelectedImage(null);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [imageDialogOpen]);

  const handleSaveField = useCallback(
    async (
      imageId: string,
      field: "image_description" | "celebrity_recognition" | "additional_context",
      value: string,
      key: "description" | "celebrity" | "context"
    ) => {
      setIsSavingField((prev) => ({ ...prev, [key]: true }));
      setSaveStatus((prev) => ({ ...prev, [key]: null }));

      const trimmed = value.trim();
      const payload = {
        [field]: trimmed.length > 0 ? trimmed : null,
      } as Record<string, string | null>;

      const { error } = await supabase
        .from("images")
        .update(payload)
        .eq("id", imageId);

      if (error) {
        setSaveStatus((prev) => ({
          ...prev,
          [key]: "Failed to save.",
        }));
        setIsSavingField((prev) => ({ ...prev, [key]: false }));
        return false;
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, [field]: payload[field] } : img
        )
      );
      setSelectedImage((prev) =>
        prev && prev.id === imageId
          ? { ...prev, [field]: payload[field] }
          : prev
      );

      setSaveStatus((prev) => ({ ...prev, [key]: "Saved." }));
      setIsSavingField((prev) => ({ ...prev, [key]: false }));
      return true;
    },
    [supabase]
  );

  const handleToggleVisibility = useCallback(
    async (imageId: string, field: "is_common_use" | "is_public", value: boolean) => {
      setIsSavingField((prev) => ({ ...prev, visibility: true }));
      setSaveStatus((prev) => ({ ...prev, visibility: null }));

      const { error } = await supabase
        .from("images")
        .update({ [field]: value })
        .eq("id", imageId);

      if (error) {
        setSaveStatus((prev) => ({
          ...prev,
          visibility: "Failed to save visibility.",
        }));
        setIsSavingField((prev) => ({ ...prev, visibility: false }));
        return false;
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, [field]: value } : img
        )
      );
      setSelectedImage((prev) =>
        prev && prev.id === imageId ? { ...prev, [field]: value } : prev
      );

      setSaveStatus((prev) => ({ ...prev, visibility: "Saved." }));
      setIsSavingField((prev) => ({ ...prev, visibility: false }));
      return true;
    },
    [supabase]
  );

  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this image?"
      );
      if (!confirmed) return;

      setIsDeleting(true);
      setDeleteError(null);

      const { error } = await supabase.from("images").delete().eq("id", imageId);

      if (error) {
        setDeleteError("Failed to delete image.");
        setIsDeleting(false);
        return;
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId));
      setSelectedImage(null);
      setImageDialogOpen(false);
      setCaptions([]);
      setIsDeleting(false);
    },
    [supabase]
  );

  const loadImageDetails = useCallback(
    async (image: ImageRow) => {
      let selected = image;

      const { data, error } = await supabase
        .from("images")
        .select(
          "id, url, created_datetime_utc, profile_id, additional_context, image_description, celebrity_recognition, is_common_use, is_public"
        )
        .eq("id", image.id)
        .single();

      if (!error && data) {
        let uploaderName: string | null = null;
        let uploaderEmail: string | null = null;

        if (data.profile_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("id", data.profile_id)
            .single();

          if (profile) {
            const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
            uploaderName = name.length > 0 ? name : null;
            uploaderEmail = profile.email ?? null;
          }
        }

        selected = {
          ...image,
          url: data.url ?? image.url,
          created_datetime_utc:
            data.created_datetime_utc ?? image.created_datetime_utc,
          profile_id: data.profile_id ?? image.profile_id,
          additional_context: data.additional_context ?? null,
          image_description: data.image_description ?? null,
          celebrity_recognition: data.celebrity_recognition ?? null,
          is_common_use:
            typeof data.is_common_use === "boolean"
              ? data.is_common_use
              : image.is_common_use ?? null,
          is_public:
            typeof data.is_public === "boolean"
              ? data.is_public
              : image.is_public ?? null,
          uploader_name: uploaderName,
          uploader_email: uploaderEmail,
        };
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  additional_context: data.additional_context ?? null,
                  image_description: data.image_description ?? null,
                  celebrity_recognition: data.celebrity_recognition ?? null,
                  is_common_use:
                    typeof data.is_common_use === "boolean"
                      ? data.is_common_use
                      : img.is_common_use ?? null,
                  is_public:
                    typeof data.is_public === "boolean"
                      ? data.is_public
                      : img.is_public ?? null,
                }
              : img
          )
        );
      }

      setSelectedImage(selected);
      setImageDialogOpen(true);

      const { data: captionsData } = await supabase
        .from("captions")
        .select("id, content, created_datetime_utc")
        .eq("image_id", image.id)
        .order("created_datetime_utc", { ascending: false });

      const normalizedCaptions = (captionsData ?? []).map((caption) => ({
        id: String(caption.id),
        content: caption.content ?? null,
        created_datetime_utc: caption.created_datetime_utc ?? null,
      }));
      setCaptions(normalizedCaptions);
    },
    [supabase]
  );

  const handleImageSelect = useCallback(
    async (image: ImageRow) => {
      await loadImageDetails(image);
    },
    [loadImageDetails]
  );

  const displayImages = useMemo(() => {
    const sorted = [...images].sort((a, b) => {
      const aTime = a.created_datetime_utc
        ? new Date(a.created_datetime_utc).getTime()
        : 0;
      const bTime = b.created_datetime_utc
        ? new Date(b.created_datetime_utc).getTime()
        : 0;
      return sortOrder === "recent" ? bTime - aTime : aTime - bTime;
    });
    const q = debouncedQuery.toLowerCase();
    if (!q) return sorted;
    return sorted.filter((image) => image.id.toLowerCase().includes(q));
  }, [images, sortOrder, debouncedQuery]);

  const clearSearch = () => {
    setImageIdQuery("");
    setDebouncedQuery("");
    inputRef.current?.focus();
  };

  const paginatedImages = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayImages.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [displayImages, currentPage]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(displayImages.length / ITEMS_PER_PAGE)),
    [displayImages.length]
  );

  const pageNumbers = useMemo(() => {
    const pages = [] as number[];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    for (let i = startPage; i <= endPage; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const selectedIndex = useMemo(() => {
    if (!selectedImage) return -1;
    return displayImages.findIndex((image) => image.id === selectedImage.id);
  }, [displayImages, selectedImage]);

  const previousImage =
    selectedIndex > 0 ? displayImages[selectedIndex - 1] : null;
  const nextImage =
    selectedIndex >= 0 && selectedIndex < displayImages.length - 1
      ? displayImages[selectedIndex + 1]
      : null;

  const uploadedByLabel = useMemo(() => {
    if (!selectedImage) return "Unknown user";
    const name = selectedImage.uploader_name ?? "";
    const email = selectedImage.uploader_email ?? "";
    if (name && email) return `${name} | ${email}`;
    if (email) return email;
    if (name) return name;
    return "Unknown user";
  }, [selectedImage]);

  return (
    <SidebarNav activeKey="images" displayName={displayName}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Images</h1>
          <p className="text-sm text-zinc-400">
            Curate common-use assets and review user uploads.
          </p>
        </header>

        <section className="grid h-[75vh] grid-rows-[auto_1fr_auto] gap-3 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950/90 to-zinc-900/40 p-3 text-sm text-zinc-300 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/images/upload")}
              className="rounded-xl border border-zinc-700 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200"
            >
              Upload Images
            </button>

            <div className="relative">
              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value as SortOrder)
                }
                className="appearance-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 pr-10 text-xs text-zinc-200"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                ▾
              </span>
            </div>

            <div className="ml-auto flex w-full max-w-md items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
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
                ref={inputRef}
                value={imageIdQuery}
                onChange={(event) => setImageIdQuery(event.target.value)}
                placeholder="Search by Image ID"
                className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-500"
              />
              {imageIdQuery.length > 0 && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={clearSearch}
                  className="rounded-full border border-zinc-800 px-2 py-1 text-[10px] text-zinc-400"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0">
            {errorMessage && (
              <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
                {errorMessage}
              </div>
            )}

            {isPending || isLoading ? (
              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6 text-sm text-zinc-500">
                Loading images...
              </div>
            ) : displayImages.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-black/40 p-6 text-sm text-zinc-500">
                No images found.
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col">
                <div className="grid h-full min-h-0 grid-cols-2 grid-rows-4 gap-3 md:grid-cols-4 md:grid-rows-2">
                  {paginatedImages.map((image) => (
                    <ImageTile
                      key={image.id}
                      image={image}
                      onSelect={handleImageSelect}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {totalPages > 1 && displayImages.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
              <span>
                Showing {Math.min(
                  (currentPage - 1) * ITEMS_PER_PAGE + 1,
                  displayImages.length
                )}{" "}
                -{" "}
                {Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  displayImages.length
                )}{" "}
                of {displayImages.length} images
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-400 disabled:opacity-50"
                >
                  First
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-400 disabled:opacity-50"
                >
                  Previous
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={classNames(
                      "rounded-full border px-3 py-1",
                      page === currentPage
                        ? "border-amber-300/70 bg-amber-300/90 text-zinc-900"
                        : "border-zinc-800 bg-zinc-950 text-zinc-300"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-300 disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-zinc-300 disabled:opacity-50"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {imageDialogOpen && selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-8">
          <div className="h-[88vh] w-[96vw] max-w-7xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  Image Details
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  {selectedImage.id}
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  Uploaded {formatTimestamp(selectedImage.created_datetime_utc)}
                </div>
                <div className="text-xs text-zinc-400">
                  Uploaded by {uploadedByLabel}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteImage(selectedImage.id)}
                  disabled={isDeleting}
                  className="rounded-full border border-red-900/40 bg-red-950/40 px-3 py-1 text-xs text-red-200 disabled:opacity-60"
                  aria-label="Delete image"
                  title="Delete image"
                >
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
                      d="M6 7h12M9.5 7l.5-2h4l.5 2M9 7v10m6-10v10M8 7v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    previousImage && void loadImageDetails(previousImage)
                  }
                  disabled={!previousImage}
                  className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => nextImage && void loadImageDetails(nextImage)}
                  disabled={!nextImage}
                  className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300 disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageDialogOpen(false);
                    setSelectedImage(null);
                    setCaptions([]);
                  }}
                  className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid h-[calc(88vh-88px)] gap-6 overflow-hidden px-6 py-6 lg:grid-cols-[2.4fr_1fr]">
              <div className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-800 bg-black/40 p-4">
                <div className="h-[40vh] w-full flex-none overflow-hidden rounded-xl bg-zinc-900">
                  {selectedImage.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedImage.url}
                      alt="Selected"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                      No image available
                    </div>
                  )}
                </div>
                <div className="mt-4 flex min-h-0 flex-1 flex-col space-y-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Captions ({captions.length})
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {captions.length === 0 ? (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-500">
                        No captions found.
                      </div>
                    ) : (
                      captions.map((caption) => (
                        <div
                          key={caption.id}
                          className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-200"
                        >
                          <div className="text-[11px] text-zinc-500">
                            {formatTimestamp(caption.created_datetime_utc)}
                          </div>
                          <div className="mt-2 text-sm text-zinc-100">
                            {caption.content || "Untitled caption"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
                {deleteError && (
                  <div className="rounded-xl border border-red-900/40 bg-red-950/40 p-3 text-xs text-red-200">
                    {deleteError}
                  </div>
                )}
                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Visibility & Usage
                  </div>
                  <div className="mt-3 space-y-3 text-xs text-zinc-400">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-zinc-200">Common Use</div>
                        <div>Include this image in the common-use library.</div>
                      </div>
                      <VisibilityToggle
                        enabled={Boolean(selectedImage.is_common_use)}
                        disabled={isSavingField.visibility}
                        onToggle={() =>
                          handleToggleVisibility(
                            selectedImage.id,
                            "is_common_use",
                            !selectedImage.is_common_use
                          )
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm text-zinc-200">Public</div>
                        <div>Allow this image to be publicly visible.</div>
                      </div>
                      <VisibilityToggle
                        enabled={Boolean(selectedImage.is_public)}
                        disabled={isSavingField.visibility}
                        onToggle={() =>
                          handleToggleVisibility(
                            selectedImage.id,
                            "is_public",
                            !selectedImage.is_public
                          )
                        }
                      />
                    </div>
                  </div>
                  {saveStatus.visibility && (
                    <div
                      className={classNames(
                        "mt-2 text-xs",
                        saveStatus.visibility === "Saved."
                          ? "text-emerald-300"
                          : "text-red-300"
                      )}
                    >
                      {saveStatus.visibility}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Image Description
                  </div>
                  <textarea
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.target.value)}
                    rows={5}
                    className="mt-3 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    placeholder="Describe the image..."
                  />
                  {saveStatus.description && (
                    <div
                      className={classNames(
                        "mt-2 text-xs",
                        saveStatus.description === "Saved."
                          ? "text-emerald-300"
                          : "text-red-300"
                      )}
                    >
                      {saveStatus.description}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveField(
                          selectedImage.id,
                          "image_description",
                          draftDescription,
                          "description"
                        )
                      }
                      disabled={isSavingField.description}
                      className="rounded-full border border-amber-300/70 bg-amber-300/90 px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-60"
                    >
                      {isSavingField.description ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftDescription(selectedImage.image_description ?? "")
                      }
                      className="text-xs text-zinc-400"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Celebrity Recognition
                  </div>
                  <textarea
                    value={draftCelebrity}
                    onChange={(event) => setDraftCelebrity(event.target.value)}
                    rows={4}
                    className="mt-3 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    placeholder="Identify any celebrities in the image..."
                  />
                  {saveStatus.celebrity && (
                    <div
                      className={classNames(
                        "mt-2 text-xs",
                        saveStatus.celebrity === "Saved."
                          ? "text-emerald-300"
                          : "text-red-300"
                      )}
                    >
                      {saveStatus.celebrity}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveField(
                          selectedImage.id,
                          "celebrity_recognition",
                          draftCelebrity,
                          "celebrity"
                        )
                      }
                      disabled={isSavingField.celebrity}
                      className="rounded-full border border-amber-300/70 bg-amber-300/90 px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-60"
                    >
                      {isSavingField.celebrity ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftCelebrity(
                          selectedImage.celebrity_recognition ?? ""
                        )
                      }
                      className="text-xs text-zinc-400"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Additional Context
                  </div>
                  <textarea
                    value={draftContext}
                    onChange={(event) => setDraftContext(event.target.value)}
                    rows={4}
                    className="mt-3 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    placeholder="Add notes about this image..."
                  />
                  {saveStatus.context && (
                    <div
                      className={classNames(
                        "mt-2 text-xs",
                        saveStatus.context === "Saved."
                          ? "text-emerald-300"
                          : "text-red-300"
                      )}
                    >
                      {saveStatus.context}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveField(
                          selectedImage.id,
                          "additional_context",
                          draftContext,
                          "context"
                        )
                      }
                      disabled={isSavingField.context}
                      className="rounded-full border border-amber-300/70 bg-amber-300/90 px-4 py-2 text-xs font-semibold text-zinc-900 disabled:opacity-60"
                    >
                      {isSavingField.context ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftContext(selectedImage.additional_context ?? "")
                      }
                      className="text-xs text-zinc-400"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarNav>
  );
}
