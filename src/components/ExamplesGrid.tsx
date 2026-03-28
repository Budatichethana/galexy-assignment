"use client";

import { useRouter } from "next/navigation";

const EXAMPLE_TEMPLATES = [
  {
    id: "product-marketing-kit",
    name: "Product Marketing Kit Generator",
    description: "Parallel image + video workflow with final AI merge",
  },
];

function ExampleCard({
  templateId,
  name,
  description,
  onOpen,
}: {
  templateId: string;
  name: string;
  description: string;
  onOpen: (templateId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(templateId)}
      className="group w-full rounded-lg border border-white/10 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-amber-300/30 hover:bg-gradient-to-br hover:from-amber-500/15 hover:to-orange-500/15 hover:shadow-[0_4px_12px_rgba(217,119,6,0.2)]"
    >
      <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/40 to-orange-500/40 text-xs font-semibold text-amber-200">
        E
      </div>
      <p className="font-semibold text-amber-100">{name}</p>
      <p className="mt-2 text-xs text-amber-300/70">{description}</p>
      <p className="mt-3 text-xs text-amber-300">Open template →</p>
    </button>
  );
}

export function ExamplesGrid() {
  const router = useRouter();

  const handleOpenTemplate = (templateId: string) => {
    router.push(`/builder?templateId=${templateId}`);
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {EXAMPLE_TEMPLATES.map((example) => (
        <ExampleCard
          key={example.id}
          templateId={example.id}
          name={example.name}
          description={example.description}
          onOpen={handleOpenTemplate}
        />
      ))}
    </div>
  );
}
