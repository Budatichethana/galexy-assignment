"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { TemplatesGrid } from "@/components/TemplatesGrid";
import { ExamplesGrid } from "@/components/ExamplesGrid";

const Sidebar = dynamic(
  () => import("@/components/Sidebar").then((mod) => mod.Sidebar),
  { ssr: false }
);

export default function NodePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"projects" | "templates" | "examples">("projects");

  return (
    <main className="min-h-screen bg-[#07090d] text-zinc-100">
      <Sidebar />

      <section className="pl-56">
        <div className="mx-auto min-h-screen max-w-[1180px] px-5 py-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101217] shadow-[0_20px_46px_rgba(0,0,0,0.28)]">
            <header className="relative min-h-[250px] border-b border-white/10 bg-[radial-gradient(circle_at_75%_0%,rgba(55,65,81,0.55),transparent_35%),radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.08),transparent_40%),linear-gradient(125deg,#3b3e46_0%,#24272f_35%,#1a1c21_100%)] p-6">
              <div className="absolute inset-0 opacity-35">
                <div className="absolute -right-8 top-8 h-24 w-44 rotate-6 rounded-xl border border-white/20 bg-black/35 backdrop-blur-sm" />
                <div className="absolute right-28 top-12 h-20 w-36 -rotate-6 rounded-xl border border-white/20 bg-black/35 backdrop-blur-sm" />
                <div className="absolute right-10 bottom-7 h-16 w-32 -rotate-3 rounded-xl border border-white/20 bg-black/35 backdrop-blur-sm" />
              </div>

              <div className="relative max-w-xl">
                <div className="mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0b66e3] text-sm font-semibold">
                  N
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">Node Editor</h1>
                <p className="mt-2 max-w-[520px] text-sm leading-relaxed text-zinc-200/90 sm:text-base">
                  Nodes is the most powerful way to operate your tools and models into
                  complex automated pipelines.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/builder?new=1")}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100"
                >
                  New Workflow
                  <span aria-hidden="true">-&gt;</span>
                </button>
              </div>
            </header>

            <div className="bg-[linear-gradient(180deg,#141821_0%,#0c1018_100%)] px-6 pb-6 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setActiveTab("projects")}
                    className={`rounded-lg px-4 py-1.5 font-medium transition-colors ${
                      activeTab === "projects"
                        ? "bg-white/8 text-white"
                        : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    Projects
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("templates")}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                      activeTab === "templates"
                        ? "bg-white/8 text-white"
                        : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    Templates
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("examples")}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                      activeTab === "examples"
                        ? "bg-white/8 text-white"
                        : "text-zinc-300 hover:text-white"
                    }`}
                  >
                    Examples
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex h-9 min-w-[220px] items-center rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-zinc-300">
                    {activeTab === "projects" ? "Search projects..." : activeTab === "templates" ? "Search templates..." : "Browse examples..."}
                  </div>
                  <button type="button" className="h-9 rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-zinc-200">
                    Last viewed
                  </button>
                  <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-zinc-300">
                    o
                  </button>
                </div>
              </div>

              <div className="mt-3.5">
                {activeTab === "projects" ? <ProjectsGrid /> : activeTab === "templates" ? <TemplatesGrid /> : <ExamplesGrid />}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
