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
  onDeleteNode?: (nodeId: string) => void;
};

type BaseNodeCardProps = {
  nodeId: string;
  title: string;
  placeholder: string;
  data?: NodeData;
  selected?: boolean;
  children?: ReactNode;
};

function BaseNodeCard({ nodeId, title, placeholder, data, selected, children }: BaseNodeCardProps) {
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
      className={`nowheel relative w-[360px] max-w-[360px] overflow-hidden rounded-2xl border bg-[#111319]/90 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all ${statusClassMap[status]} ${
        selected
          ? "border-cyan-300/95 shadow-[0_0_0_1px_rgba(103,232,249,0.45),0_0_28px_rgba(34,211,238,0.65)]"
          : ""
      }`}
    >
      <button
        type="button"
        aria-label="Delete node"
        title="Delete node"
        className="nodrag absolute -right-3 -top-3 z-20 rounded-full border border-white/20 bg-zinc-900/95 p-1.5 text-zinc-200 shadow-[0_6px_16px_rgba(0,0,0,0.35)] transition-colors hover:border-rose-300/60 hover:bg-rose-500/90 hover:text-white"
        onClick={(event) => {
          event.stopPropagation();
          data?.onDeleteNode?.(nodeId);
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3.5 w-3.5"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
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
        <div className="output-scroll mt-1 max-h-36 min-h-16 overflow-y-auto overflow-x-hidden rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-[11px] leading-relaxed text-zinc-400 whitespace-pre-wrap break-words">
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

export function TextNode({ id, data, selected }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="Text Node"
      placeholder="Placeholder: text prompt"
      data={data}
      selected={selected}
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

export function ImageNode({ id, data, selected }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="Image Node"
      placeholder="Placeholder: image upload"
      data={data}
      selected={selected}
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

export function VideoNode({ id, data, selected }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="Video Node"
      placeholder="Placeholder: video upload"
      data={data}
      selected={selected}
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

export function LLMNode({ id, data, selected }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="LLM Node"
      placeholder="Placeholder: model settings"
      data={data}
      selected={selected}
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

export function CropNode({ id, data, selected }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="Crop Node"
      placeholder="Placeholder: crop settings"
      data={data}
      selected={selected}
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

export function FrameNode({ id, data, selected }: NodeProps<NodeData>) {
  const isInputConnected = Boolean(data?.isInputConnected);

  return (
    <BaseNodeCard
      nodeId={id}
      title="Frame Node"
      placeholder="Placeholder: frame extraction"
      data={data}
      selected={selected}
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
