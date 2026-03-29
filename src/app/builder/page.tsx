import { Suspense } from "react";
import FlowCanvas from "@/components/FlowCanvas";

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-500">Loading builder...</div>}>
      <FlowCanvas />
    </Suspense>
  );
}
