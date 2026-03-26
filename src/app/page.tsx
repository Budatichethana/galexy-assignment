import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const features = [
    {
      title: "Visual Workflow Builder",
      description: "Design complex AI pipelines with drag-and-drop nodes and clean graph controls.",
    },
    {
      title: "LLM Integration",
      description: "Connect prompts, models, and tools into reusable blocks for fast experimentation.",
    },
    {
      title: "Parallel Execution",
      description: "Run independent branches concurrently to speed up multi-step workflow execution.",
    },
    {
      title: "Image/Video Processing",
      description: "Blend language tasks with visual media steps in one unified workflow runtime.",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white selection:bg-cyan-500/30">
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
            <div className="relative flex items-center justify-center rounded-lg bg-white/5 p-1.5 ring-1 ring-white/10">
              <Image 
                src="/assets/logowith.png" 
                alt="NextFlow Logo" 
                width={120} 
                height={32} 
                className="h-6 w-auto object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                priority
              />
            </div>
            <span className="font-semibold tracking-wide text-zinc-100">NextFlow</span>
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="#features" className="hidden text-zinc-400 transition hover:text-white sm:block">Features</Link>
            <div className="hidden h-4 w-px bg-white/10 sm:block" />
            <Link 
              href="/sign-in" 
              className="rounded-full bg-cyan-500/10 px-5 py-2 text-cyan-400 ring-1 ring-inset ring-cyan-500/20 transition-all hover:bg-cyan-500/20 hover:ring-cyan-500/40"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-32 sm:px-8 lg:px-12">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:p-12 lg:p-16">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-[100px]" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px]" />

          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-wide text-cyan-200">
              NextFlow
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">
              NextFlow — Build AI Workflows Visually
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-zinc-300 sm:text-base">
              Drag, connect, and run LLM-powered workflows with ease
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-500 px-8 text-sm font-semibold text-zinc-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-105 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
              >
                Start Building Free
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-sm font-semibold text-zinc-300 transition-all hover:bg-white/10 hover:text-white"
              >
                Explore Features
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="mt-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <h2 className="text-base font-semibold text-zinc-100">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-6 text-center text-sm text-zinc-400">
          Built with Next.js, Trigger.dev, and LLMs
        </footer>
      </div>
    </main>
  );
}
