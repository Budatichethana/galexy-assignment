"use client";

import { useRouter } from "next/navigation";
import { WORKFLOW_TEMPLATES } from "@/lib/workflowTemplates";

const previewGradients = [
  "bg-[linear-gradient(135deg,#8ec5fc_0%,#4666b0_46%,#0f1323_100%)]",
  "bg-[linear-gradient(135deg,#f6d365_0%,#b3772e_45%,#1a1308_100%)]",
  "bg-[linear-gradient(135deg,#84fab0_0%,#2e8b57_42%,#071611_100%)]",
];

function TemplateCard({
  templateId,
  name,
  index,
  onOpen,
}: {
  templateId: string;
  name: string;
  index: number;
  onOpen: (templateId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(templateId)}
      className="group w-full rounded-lg border border-white/10 bg-zinc-900/55 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-zinc-800/70 hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
    >
      <div
        className={`mb-3 aspect-[16/10] rounded-lg border border-white/10 ${previewGradients[index % previewGradients.length]}`}
      />
      <p className="text-base font-semibold leading-tight text-zinc-100">{name}</p>
      <p className="mt-0.5 text-xs text-zinc-400">Open template</p>
    </button>
  );
}

export function TemplatesGrid() {
  const router = useRouter();

  const handleOpenTemplate = (templateId: string) => {
    router.push(`/builder?templateId=${templateId}`);
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {WORKFLOW_TEMPLATES.map((template, index) => (
        <TemplateCard
          key={template.id}
          templateId={template.id}
          name={template.name}
          index={index}
          onOpen={handleOpenTemplate}
        />
      ))}
    </div>
  );
}
