type AvatarBadgeProps = {
  label: string;
};

export default function AvatarBadge({ label }: AvatarBadgeProps) {
  const display = label.trim() || "A";
  return (
    <div className="grid h-12 w-12 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-200 shadow-[0_10px_20px_rgba(0,0,0,0.35)]">
      {display.slice(0, 1).toUpperCase()}
    </div>
  );
}
