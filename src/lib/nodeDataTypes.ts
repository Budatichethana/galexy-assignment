import type { WorkflowNodeType } from "@/lib/triggerTasks";

export type NodeDataType = "text" | "image" | "video";

export type NodeOutputTypeByNodeType = {
  [K in WorkflowNodeType]: NodeDataType;
};

export type NodeAcceptedInputTypesByNodeType = {
  [K in WorkflowNodeType]: readonly NodeDataType[];
};

export const NODE_OUTPUT_TYPE_BY_NODE_TYPE: NodeOutputTypeByNodeType = {
  text: "text",
  image: "image",
  video: "video",
  crop: "image",
  frame: "image",
  llm: "text",
};

export const NODE_ACCEPTED_INPUT_TYPES_BY_NODE_TYPE: NodeAcceptedInputTypesByNodeType = {
  text: [],
  image: [],
  video: [],
  crop: ["image"],
  frame: ["video"],
  llm: ["text", "image"],
};

export function isWorkflowNodeType(nodeType: string): nodeType is WorkflowNodeType {
  return nodeType in NODE_OUTPUT_TYPE_BY_NODE_TYPE;
}

export function getNodeOutputType(nodeType: string): NodeDataType {
  if (!isWorkflowNodeType(nodeType)) {
    throw new Error(`Unsupported node type: ${nodeType}`);
  }

  return NODE_OUTPUT_TYPE_BY_NODE_TYPE[nodeType];
}

export function isConnectionTypeCompatible(
  sourceNodeType: string,
  targetNodeType: string,
): boolean {
  if (!isWorkflowNodeType(sourceNodeType) || !isWorkflowNodeType(targetNodeType)) {
    return false;
  }

  const sourceOutputType = getNodeOutputType(sourceNodeType);
  const acceptedInputTypes = NODE_ACCEPTED_INPUT_TYPES_BY_NODE_TYPE[targetNodeType];

  return acceptedInputTypes.includes(sourceOutputType);
}
