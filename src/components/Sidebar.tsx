"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

type ToolItem = {
  label: string;
  icon: string;
};

const toolItems: ToolItem[] = [
  { label: "Image", icon: "I" },
  { label: "Video", icon: "V" },
  { label: "Enhancer", icon: "E" },
  { label: "Nano Banana", icon: "N" },
  { label: "Realtime", icon: "R" },
  { label: "Edit", icon: "Ed" },
  { label: "More", icon: "..." },
];

function getNavItemClassName(isActive: boolean): string {
  if (isActive) {
    return "rounded-lg border border-white/10 bg-zinc-800/80 px-2.5 py-2 text-sm font-medium text-white";
  }

  return "rounded-lg border border-transparent px-2.5 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/10 hover:bg-zinc-900";
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-white/10 bg-black/95 p-2.5">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-center justify-between px-1">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/80"
            onClick={() => {
              console.log("open workspace switcher");
            }}
          >
            []
          </button>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-white/80"
            onClick={() => {
              console.log("toggle sidebar");
            }}
          >
            =
          </button>
        </div>

        <div className="mt-0.5">
          <nav className="flex flex-col gap-2">
            <Link href="/" className={getNavItemClassName(pathname === "/")}>
              <span className="flex items-center gap-2.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-xs">⌂</span>
                Home
              </span>
            </Link>

            <Link href="/node" className={getNavItemClassName(pathname === "/node")}>
              <span className="flex items-center gap-2.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/35 text-xs">N</span>
                Node Editor
              </span>
            </Link>
          </nav>
        </div>

        <div className="mt-7 border-t border-white/5 pt-4">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
            Tools
          </h2>
          <div className="mt-2.5 flex flex-col gap-1">
            {toolItems.map((tool) => (
              <button
                key={tool.label}
                type="button"
                onClick={() => {
                  console.log(tool.label);
                }}
                className="rounded-lg border border-transparent px-2 py-1.5 text-left text-[13px] font-medium text-zinc-400 transition-colors hover:border-white/10 hover:bg-zinc-900 hover:text-zinc-200"
              >
                <span className="flex items-center gap-2.5">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/5 text-[9px] text-zinc-200">{tool.icon}</span>
                  {tool.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto rounded-lg border border-white/10 bg-zinc-900/70 p-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-400">Profile</p>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-8 w-8",
                },
              }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
