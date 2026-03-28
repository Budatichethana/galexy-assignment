export type WorkflowNodeType =
  | "text"
  | "image"
  | "video"
  | "llm"
  | "crop"
  | "frame";

export type NodeExecutionPayload = {
  nodeId: string;
  nodeType: WorkflowNodeType;
  label?: string;
  manualInput?: string;
  chainedInputs: string[];
  systemPrompt?: string;
  userMessage?: string;
  images?: string[];
  video?: string;
};

export type NodeTaskOutput = {
  output: string;
};

export const NODE_TASK_IDS: Record<WorkflowNodeType, string> = {
  text: "text-node-task",
  image: "image-node-task",
  video: "video-node-task",
  llm: "llm-node-task",
  crop: "crop-node-task",
  frame: "frame-node-task",
};
