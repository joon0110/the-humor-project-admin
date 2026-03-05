"use client";

import { useMemo, useState } from "react";
import SignOutButton from "@/app/components/SignOutButton";

type AccountMenuProps = {
  displayName: string;
};

export default function AccountMenu({ displayName }: AccountMenuProps) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const formattedName = useMemo(() => {
    const trimmed = displayName.trim();
    return trimmed.length > 0 ? trimmed : "Account";
  }, [displayName]);

  return (
    <div className="relative">
      {isAccountOpen && (
        <div className="absolute -top-16 left-0 w-full rounded-[26px] border border-zinc-800 bg-zinc-950 px-4 py-3 shadow-[0_12px_24px_rgba(0,0,0,0.35)]">
          <SignOutButton />
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsAccountOpen((open) => !open)}
        className="flex w-full items-center justify-between rounded-[28px] border border-zinc-800 bg-zinc-950 px-5 py-4 text-left shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
      >
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Account
          </div>
          <div className="mt-1 text-base font-semibold text-white">
            {formattedName}
          </div>
        </div>
        <div className="text-2xl text-zinc-400">&rsaquo;</div>
      </button>
    </div>
  );
}
