import type { ReactNode } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

export type NodeType = "text" | "image" | "video" | "llm" | "crop" | "frame";

export type NodeStatus = "idle" | "running" | "success" | "failed";

export type NodeData = {
  label?: string;
  output?: string;
  status?: NodeStatus;
  isInputConnected?: boolean;
  manualInput?: string;
  systemPrompt?: string;
  userMessage?: string;
  images?: string[];
  onManualInputChange?: (nodeId: string, value: string) => void;
  onSystemPromptChange?: (nodeId: string, value: string) => void;
  onUserMessageChange?: (nodeId: string, value: string) => void;
  onRunSingle?: (nodeId: string) => Promise<void>;
  onRunPartial?: (nodeId: string) => Promise<void>;
};

type BaseNodeCardProps = {
  nodeId: string;
  title: string;
  placeholder: string;
  data?: NodeData;
  children?: ReactNode;
};

function BaseNodeCard({ nodeId, title, placeholder, data, children }: BaseNodeCardProps) {
  const isInputConnected = Boolean(data?.isInputConnected);
  const status = data?.status ?? "idle";
  const outputText = data?.output?.trim() ? data.output : "No output yet";
  const statusLabelMap: Record<NodeStatus, string> = {
    idle: "Idle",
    running: "Running...",
    success: "Success",
    failed: "Failed",
  };
  const statusClassMap: Record<NodeStatus, string> = {
    idle: "border-white/15",
    running: "border-amber-400/80 shadow-[0_0_0_1px_rgba(251,191,36,0.15)]",
    success: "border-emerald-400/80 shadow-[0_0_0_1px_rgba(52,211,153,0.15)]",
    failed: "border-rose-400/80 shadow-[0_0_0_1px_rgba(251,113,133,0.15)]",
  };

  return (
    <div
      className={`relative min-w-[290px] rounded-2xl border bg-[#111319]/90 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-colors ${statusClassMap[status]}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ top: "50%", transform: "translateY(-50%)" }}
      />
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-zinc-100">{title}</h3>
        <span
          className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            status === "running"
              ? "border-amber-300/40 bg-amber-500/15 text-amber-200"
              : status === "success"
                ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
                : status === "failed"
                  ? "border-rose-300/40 bg-rose-500/15 text-rose-200"
                  : "border-white/10 bg-white/10 text-zinc-300"
          }`}
        >
          {statusLabelMap[status]}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-400">{placeholder}</p>
      {data?.label ? <p className="mt-2 text-xs text-zinc-500">{data.label}</p> : null}
      <p className="mt-2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-300">
        Input: {isInputConnected ? "Connected" : "Manual"}
      </p>
      {isInputConnected ? (
        <p className="mt-2 rounded-md border border-sky-300/20 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-200">
          Using connected input
        </p>
      ) : null}
      <div className={isInputConnected ? "pointer-events-none" : ""}>{children}</div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void data?.onRunSingle?.(nodeId)}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-white/15"
        >
          Run
        </button>
        <button
          type="button"
          onClick={() => void data?.onRunPartial?.(nodeId)}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-white/15"
        >
          Run Up To Here
        </button>
      </div>
      <div className="mt-3 border-t border-white/10 pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">Output</p>
        <div className="mt-1 max-h-24 overflow-auto rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-[11px] text-zinc-400">
          {outputText}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ top: "50%", transform: "translateY(-50%)" }}
      />
    </div>
  );
}

export function TextNode({ id, data }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="Text Node"
      placeholder="Placeholder: text prompt"
      data={data}
    >
      <textarea
        className="mt-2 h-20 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/60 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-zinc-500 disabled:opacity-70"
        placeholder="Write text..."
        value={data?.manualInput ?? ""}
        onChange={(event) => data?.onManualInputChange?.(id, event.target.value)}
        disabled={isInputConnected}
      />
    </BaseNodeCard>
  );
}

export function ImageNode({ id, data }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="Image Node"
      placeholder="Placeholder: image upload"
      data={data}
    >
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/60 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-zinc-500 disabled:opacity-70"
        placeholder="Image URL"
        value={data?.manualInput ?? ""}
        onChange={(event) => data?.onManualInputChange?.(id, event.target.value)}
        disabled={isInputConnected}
      />
    </BaseNodeCard>
  );
}

export function VideoNode({ id, data }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="Video Node"
      placeholder="Placeholder: video upload"
      data={data}
    >
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/60 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-zinc-500 disabled:opacity-70"
        placeholder="Video URL"
        value={data?.manualInput ?? ""}
        onChange={(event) => data?.onManualInputChange?.(id, event.target.value)}
        disabled={isInputConnected}
      />
    </BaseNodeCard>
  );
}

export function LLMNode({ id, data }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="LLM Node"
      placeholder="Placeholder: model settings"
      data={data}
    >
      <textarea
        className="mt-2 h-16 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/60 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-zinc-500 disabled:opacity-70"
        placeholder="System prompt"
        value={data?.systemPrompt ?? ""}
        onChange={(event) => data?.onSystemPromptChange?.(id, event.target.value)}
        disabled={isInputConnected}
      />
      <textarea
        className="mt-2 h-16 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/60 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-zinc-500 disabled:opacity-70"
        placeholder="User message"
        value={data?.userMessage ?? ""}
        onChange={(event) => data?.onUserMessageChange?.(id, event.target.value)}
        disabled={isInputConnected}
      />
    </BaseNodeCard>
  );
}

export function CropNode({ id, data }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="Crop Node"
      placeholder="Placeholder: crop settings"
      data={data}
    >
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/60 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-zinc-500 disabled:opacity-70"
        placeholder="Crop region"
        value={data?.manualInput ?? ""}
        onChange={(event) => data?.onManualInputChange?.(id, event.target.value)}
        disabled={isInputConnected}
      />
    </BaseNodeCard>
  );
}

export function FrameNode({ id, data }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="Frame Node"
      placeholder="Placeholder: frame extraction"
      data={data}
    >
      <input
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-zinc-200 outline-none transition-colors placeholder:text-zinc-500 focus:border-sky-300/60 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-zinc-500 disabled:opacity-70"
        placeholder="Frame index"
        value={data?.manualInput ?? ""}
        onChange={(event) => data?.onManualInputChange?.(id, event.target.value)}
        disabled={isInputConnected}
      />
    </BaseNodeCard>
  );
}

export const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  llm: LLMNode,
  crop: CropNode,
  frame: FrameNode,
};
