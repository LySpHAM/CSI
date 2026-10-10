import Link from "next/link";
import { APP_INITIALS, APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

/** Logo CSI. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={APP_NAME}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg font-semibold tracking-tight focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-10 place-items-center rounded-xl bg-[#c8f0dc] text-[0.68rem] font-extrabold tracking-wide text-[#103e32] shadow-soft ring-1 ring-white/25"
      >
        {APP_INITIALS}
      </span>
      <span className="text-base">{APP_NAME}</span>
    </Link>
  );
}
