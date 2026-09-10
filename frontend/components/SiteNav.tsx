"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * SiteNav — persistent top navigation rendered in the root layout.
 * Highlights the active page (Home vs Observatory) based on the path.
 */
export default function SiteNav() {
  const pathname = usePathname();
  const active: "home" | "observatory" | "about" = pathname.startsWith("/observatory")
    ? "observatory"
    : pathname.startsWith("/about")
      ? "about"
      : "home";

  return (
    <header className="sticky top-0 z-40 border-b border-graphite-700/70 bg-graphite-950/80 backdrop-blur-md">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="font-display text-lg italic tracking-tight text-paper transition hover:text-amber-300"
        >
          AI <span className="text-amber-300">Memory</span> Observatory
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/"
            className={`nav-glow rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
              active === "home"
                ? "bg-graphite-800 text-amber-300"
                : "text-paper/55 hover:bg-graphite-900 hover:text-paper"
            }`}
          >
            Home
          </Link>
          <Link
            href="/observatory"
            className={`nav-glow rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
              active === "observatory"
                ? "bg-graphite-800 text-cyan-300"
                : "text-paper/55 hover:bg-graphite-900 hover:text-paper"
            }`}
          >
            Observatory
          </Link>
          <Link
            href="/about"
            className={`nav-glow rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
              active === "about"
                ? "bg-graphite-800 text-amber-300"
                : "text-paper/55 hover:bg-graphite-900 hover:text-paper"
            }`}
          >
            About
          </Link>
        </div>
      </nav>
    </header>
  );
}