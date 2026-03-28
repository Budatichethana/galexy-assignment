"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  MiniMap,
  type Node,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  nodeTypes,
  type ConnectedHandleMap,
  type InputHandleId,
  type NodeData,
  type NodeStatus,
  type NodeType,
} from "@/components/nodes";
import { HistorySidebar } from "@/components/HistorySidebar";
import { hasDirectedCycle } from "@/lib/dagCycle";
import { isConnectionTypeCompatible } from "@/lib/nodeDataTypes";
import { getWorkflowTemplateById } from "@/lib/workflowTemplates";

const sidebarItems = [
  { label: "Text", type: "text" as const },
  { label: "Upload Image", type: "image" as const },
  { label: "Upload Video", type: "video" as const },
  { label: "LLM", type: "llm" as const },
  { label: "Crop Image", type: "crop" as const },
  { label: "Extract Frame", type: "frame" as const },
].map((item) => ({
  ...item,
  icon:
    item.type === "text" ? (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M4 5h12" />
        <path d="M6.5 9h7" />
        <path d="M8 13h4" />
      </svg>
    ) : item.type === "image" ? (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <circle cx="8" cy="8" r="1.2" />
        <path d="M5.5 14l3.5-3 2.3 2 2.7-2.5 2 3.5" />
      </svg>
    ) : item.type === "video" ? (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="5" width="10" height="10" rx="2" />
        <path d="M13 8l4-2v8l-4-2" />
      </svg>
    ) : item.type === "llm" ? (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M10 3l1.2 3.3L14.5 7.5l-3.3 1.2L10 12l-1.2-3.3L5.5 7.5l3.3-1.2L10 3z" />
        <path d="M4 13l.7 1.8L6.5 15l-1.8.7L4 17.5l-.7-1.8L1.5 15l1.8-.2L4 13z" />
        <path d="M16 12l.8 2 2 .2-2 .8-.8 2-.8-2-2-.8 2-.2.8-2z" />
      </svg>
    ) : item.type === "crop" ? (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <path d="M6 7.5h5v5H6z" />
        <path d="M11 10h3" />
        <path d="M9 12v3" />
      </svg>
    ) : (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="3" y="4" width="14" height="12" rx="2" />
        <path d="M7 4v12" />
        <path d="M13 4v12" />
      </svg>
    ),
}));

const emptyNodes: Node<NodeData, NodeType>[] = [];
const emptyEdges: Edge[] = [];

const WORKFLOW_ID_STORAGE_KEY = "nextflow:workflowId";

type CropConfig = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type NodeExecutionInputs = {
  chainedInputs: string[];
  systemPrompt?: string;
  userMessage?: string;
  images?: string[];
  video?: string;
  cropConfig?: CropConfig;
  timestamp?: number | `${number}%`;
  manualInput?: string;
  label?: string;
};

function parseCropConfig(value: string | undefined): CropConfig | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const normalized = value.trim();

  // Accept comma-separated format like x=10,y=10,w=80,h=80.
  const parts = normalized.split(",").map((part) => part.trim());
  const values: Record<string, number> = {};

  for (const part of parts) {
    const [key, raw] = part.split("=").map((item) => item.trim());
    if (!key || !raw) {
      continue;
    }

    const numeric = Number.parseFloat(raw.replace("%", ""));
    if (!Number.isFinite(numeric)) {
      continue;
    }

    values[key.toLowerCase()] = numeric;
  }

  const xPercent = values.x;
  const yPercent = values.y;
  const widthPercent = values.w ?? values.width;
  const heightPercent = values.h ?? values.height;

  if (
    xPercent === undefined
    || yPercent === undefined
    || widthPercent === undefined
    || heightPercent === undefined
  ) {
    return undefined;
  }

  return {
    xPercent,
    yPercent,
    widthPercent,
    heightPercent,
  };
}

function parseTimestamp(value: string | undefined): number | `${number}%` | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const normalized = value.trim();

  if (/^[0-9]+(?:\.[0-9]+)?%$/.test(normalized)) {
    return normalized as `${number}%`;
  }

  const numeric = Number.parseFloat(normalized);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric;
  }

  return undefined;
}

function getNextNodeId(nodeList: Array<{ id: string }>) {
  const maxNumericId = nodeList.reduce((maxValue, node) => {
    const numericId = Number.parseInt(node.id, 10);
    return Number.isNaN(numericId) ? maxValue : Math.max(maxValue, numericId);
  }, 0);

  return maxNumericId + 1;
}

export default function FlowCanvas() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [workflowId, setWorkflowId] = useState("");
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [, setWorkflowMessage] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const nextNodeId = useRef(1);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoSaveSuspendedRef = useRef(true);
  const lastSavedSnapshotRef = useRef("");
  
  // Execution tracking
  const currentRunIdRef = useRef<string | null>(null);
  const nodeRunIdsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const getWorkflowSnapshot = useCallback(
    (currentNodes: Node<NodeData, NodeType>[], currentEdges: Edge[], currentName: string) =>
      JSON.stringify({
        nodes: currentNodes,
        edges: currentEdges,
        name: currentName.trim() || "Untitled Workflow",
      }),
    [],
  );

  const setNodeStatus = useCallback(
    (nodeId: string, status: NodeStatus) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  status,
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const setNodeField = useCallback(
    (nodeId: string, patch: Partial<NodeData>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...patch,
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const handleManualInputChange = useCallback(
    (nodeId: string, value: string) => {
      setNodeField(nodeId, { manualInput: value });
    },
    [setNodeField],
  );

  const handleSystemPromptChange = useCallback(
    (nodeId: string, value: string) => {
      setNodeField(nodeId, { systemPrompt: value });
    },
    [setNodeField],
  );

  const handleUserMessageChange = useCallback(
    (nodeId: string, value: string) => {
      setNodeField(nodeId, { userMessage: value });
    },
    [setNodeField],
  );

  const uploadAsset = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const result = (await response.json()) as { url?: string };
    if (!result.url) {
      throw new Error("Upload URL missing");
    }

    return result.url;
  }, []);

  const handleImageUpload = useCallback(
    async (nodeId: string, file: File) => {
      const url = await uploadAsset(file);
      setNodeField(nodeId, {
        manualInput: url,
        output: url,
      });
    },
    [setNodeField, uploadAsset],
  );

  const handleVideoUpload = useCallback(
    async (nodeId: string, file: File) => {
      const url = await uploadAsset(file);
      setNodeField(nodeId, {
        manualInput: url,
        output: url,
      });
    },
    [setNodeField, uploadAsset],
  );

  const getNodeExecutionInputs = useCallback(
    (
      nodeId: string,
      nodeList: Node<NodeData>[] = nodesRef.current,
      edgeList: Edge[] = edgesRef.current,
    ) => {
      const targetNode = nodeList.find((node) => node.id === nodeId);
      const textInputs: string[] = [];
      const imageInputs: string[] = [];
      const videoInputs: string[] = [];
      const systemPromptInputs: string[] = [];
      const userMessageInputs: string[] = [];

      const incomingEdges = edgeList.filter((edge) => edge.target === nodeId);

      for (const edge of incomingEdges) {
        const sourceNode = nodeList.find((node) => node.id === edge.source);
        const output = sourceNode?.data.output?.trim();

        if (!sourceNode || !output) {
          continue;
        }

        if (edge.targetHandle === "system_prompt") {
          systemPromptInputs.push(output);
          continue;
        }

        if (edge.targetHandle === "user_message") {
          userMessageInputs.push(output);
          continue;
        }

        if (edge.targetHandle === "images" || edge.targetHandle === "image") {
          imageInputs.push(output);
          continue;
        }

        if (edge.targetHandle === "video") {
          videoInputs.push(output);
          continue;
        }

        // Strict handle mapping: ignore edges without a supported targetHandle.
      }

      const manualInput = targetNode?.data.manualInput?.trim();
      const defaultUserMessage = targetNode?.data.userMessage?.trim();
      const defaultSystemPrompt = targetNode?.data.systemPrompt?.trim();

      const chainedInputs = [...textInputs];

      if (targetNode?.type === "text" && manualInput) {
        chainedInputs.push(manualInput);
      }

      return {
        chainedInputs,
        systemPrompt: systemPromptInputs[0] || defaultSystemPrompt,
        userMessage: userMessageInputs[0] || defaultUserMessage,
        images: imageInputs.length > 0 ? imageInputs : undefined,
        video: videoInputs[0],
        cropConfig: parseCropConfig(targetNode?.data.manualInput),
        timestamp: parseTimestamp(targetNode?.data.manualInput),
        manualInput,
        label: targetNode?.data.label,
      } satisfies NodeExecutionInputs;
    },
    [],
  );

  const getConnectedInputHandles = useCallback(
    (
      nodeId: string,
      edgeList: Edge[] = edges,
    ): ConnectedHandleMap => {
      const connectedHandles: ConnectedHandleMap = {};

      for (const edge of edgeList) {
        if (edge.target !== nodeId || !edge.targetHandle) {
          continue;
        }

        const handleId = edge.targetHandle as InputHandleId;
        connectedHandles[handleId] = true;
      }

      return connectedHandles;
    },
    [edges],
  );

  const runNode = useCallback(
    async (nodeId: string) => {
      setNodeStatus(nodeId, "running");

      try {
        const currentNodes = nodesRef.current;
        const targetNode = currentNodes.find((node) => node.id === nodeId);

        if (!targetNode || !targetNode.type) {
          throw new Error("Node not found");
        }

        const inputs = getNodeExecutionInputs(nodeId, currentNodes, edgesRef.current);

        // Log node execution start
        const runId = currentRunIdRef.current;
        if (runId) {
          console.log("NodeRun init:", nodeId);
          const initResponse = await fetch("/api/node-run/init", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              runId,
              nodeId,
              nodeType: targetNode.type,
              input: inputs,
            }),
          });

          if (!initResponse.ok) {
            throw new Error("NodeRun init failed");
          }

          const { nodeRunId } = (await initResponse.json()) as { nodeRunId: string };
          nodeRunIdsRef.current.set(nodeId, nodeRunId);
        }

        const response = await fetch("/api/run-node", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nodeId,
            nodeType: targetNode.type,
            inputs,
          }),
        });

        if (!response.ok) {
          throw new Error("Task execution failed");
        }

        const result = (await response.json()) as {
          output?: unknown;
          type?: "text" | "image" | "video";
        };
        const outputText =
          typeof result.output === "string"
            ? result.output.trim() || "No output"
            : JSON.stringify(result.output ?? "No output");

        // Log node execution success
        const nodeRunId = nodeRunIdsRef.current.get(nodeId);
        if (nodeRunId && runId) {
          console.log("NodeRun complete:", nodeId);
          const completeResponse = await fetch(`/api/node-run/${nodeRunId}/complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              output: {
                output: result.output ?? outputText,
                type: result.type || "text",
              },
            }),
          });

          if (!completeResponse.ok) {
            throw new Error("NodeRun update failed");
          }
        }

        setNodes((currentNodes) =>
          currentNodes.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    output: outputText,
                    status: "success",
                  },
                }
              : node,
          ),
        );
      } catch (error) {
        console.error("Node execution failed:", { nodeId, error });

        // Log node execution failure
        const nodeRunId = nodeRunIdsRef.current.get(nodeId);
        const runId = currentRunIdRef.current;
        if (nodeRunId && runId) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          const failResponse = await fetch(`/api/node-run/${nodeRunId}/fail`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ error: errorMessage }),
          });

          if (!failResponse.ok) {
            throw new Error("NodeRun update failed");
          }
        }

        setNodeStatus(nodeId, "failed");
        throw error;
      }
    },
    [getNodeExecutionInputs, setNodeStatus, setNodes],
  );

  const executeNodeSet = useCallback(
    async (nodeIdsToExecute: Set<string>) => {
      const dependencyCount = new Map<string, number>();
      const childrenMap = new Map<string, string[]>();

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          nodeIdsToExecute.has(node.id)
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: "idle",
                },
              }
            : node,
        ),
      );

      for (const node of nodes) {
        if (!nodeIdsToExecute.has(node.id)) {
          continue;
        }

        dependencyCount.set(node.id, 0);
        childrenMap.set(node.id, []);
      }

      for (const edge of edges) {
        if (!nodeIdsToExecute.has(edge.source) || !nodeIdsToExecute.has(edge.target)) {
          continue;
        }

        dependencyCount.set(edge.target, (dependencyCount.get(edge.target) ?? 0) + 1);
        childrenMap.set(edge.source, [
          ...(childrenMap.get(edge.source) ?? []),
          edge.target,
        ]);
      }

      let currentLevel = Array.from(nodeIdsToExecute).filter(
        (nodeId) => (dependencyCount.get(nodeId) ?? 0) === 0,
      );

      while (currentLevel.length > 0) {
        await Promise.all(
          currentLevel.map((nodeId) =>
            runNode(nodeId).catch((error) => {
              console.error("runNode failed in executeNodeSet:", { nodeId, error });
              throw error;
            }),
          ),
        );

        const nextLevel: string[] = [];

        for (const nodeId of currentLevel) {
          for (const childId of childrenMap.get(nodeId) ?? []) {
            const nextDependencies = (dependencyCount.get(childId) ?? 0) - 1;
            dependencyCount.set(childId, nextDependencies);

            if (nextDependencies === 0) {
              nextLevel.push(childId);
            }
          }
        }

        currentLevel = nextLevel;
      }
    },
    [edges, nodes, runNode, setNodes],
  );

  const initializeWorkflowExecution = useCallback(async () => {
    if (!workflowId) {
      throw new Error("Please save workflow first");
    }

    const initRunResponse = await fetch("/api/workflow-run/init", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workflowId }),
    });

    if (!initRunResponse.ok) {
      throw new Error("Failed to initialize workflow run");
    }

    const { runId } = (await initRunResponse.json()) as { runId: string };
    currentRunIdRef.current = runId;
    nodeRunIdsRef.current.clear();
    return runId;
  }, [workflowId]);

  const completeWorkflowExecution = useCallback(
    async (runId: string, status: "success" | "failed") => {
      await fetch(`/api/workflow-run/${runId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
    },
    [],
  );

  const ensureWorkflowRunForNodeExecution = useCallback(async () => {
    if (currentRunIdRef.current) {
      return currentRunIdRef.current;
    }

    return initializeWorkflowExecution();
  }, [initializeWorkflowExecution]);

  const executeWorkflow = useCallback(async () => {
    try {
      const cycleExists = hasDirectedCycle(
        nodesRef.current.map((node) => ({ id: node.id })),
        edgesRef.current.map((edge) => ({
          source: edge.source,
          target: edge.target,
        })),
      );

      if (cycleExists) {
        setWorkflowMessage(
          "Workflow contains a cycle. Remove circular connections before running.",
        );
        return;
      }

      const runId = await initializeWorkflowExecution();

      try {
        // Execute all nodes
        await executeNodeSet(new Set(nodes.map((node) => node.id)));

        // Complete workflow run
        await completeWorkflowExecution(runId, "success");

        setWorkflowMessage(`Workflow completed. Run ID: ${runId}`);
      } catch (error) {
        // Mark workflow as failed
        await completeWorkflowExecution(runId, "failed");

        throw error;
      } finally {
        currentRunIdRef.current = null;
        nodeRunIdsRef.current.clear();
        setHistoryRefreshKey((prev) => prev + 1);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Workflow execution failed";
      setWorkflowMessage(message);
    }
  }, [completeWorkflowExecution, executeNodeSet, initializeWorkflowExecution, nodes]);

  const runSingleNode = useCallback(
    async (nodeId: string) => {
      try {
        const runId = await ensureWorkflowRunForNodeExecution();
        await executeNodeSet(new Set([nodeId]));
        await completeWorkflowExecution(runId, "success");
        setWorkflowMessage(`Node run completed. Run ID: ${runId}`);
      } catch (error) {
        const runId = currentRunIdRef.current;
        if (runId) {
          await completeWorkflowExecution(runId, "failed");
        }

        const message =
          error instanceof Error ? error.message : "Node execution failed";
        setWorkflowMessage(message);
      } finally {
        currentRunIdRef.current = null;
        nodeRunIdsRef.current.clear();
        setHistoryRefreshKey((prev) => prev + 1);
      }
    },
    [completeWorkflowExecution, ensureWorkflowRunForNodeExecution, executeNodeSet],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
      setEdges((currentEdges) =>
        currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
    },
    [setEdges, setNodes],
  );

  const getAllParentNodes = useCallback(
    (nodeId: string) => {
      const visited = new Set<string>();

      const visit = (currentNodeId: string) => {
        for (const edge of edges) {
          if (edge.target !== currentNodeId) {
            continue;
          }

          if (visited.has(edge.source)) {
            continue;
          }

          visited.add(edge.source);
          visit(edge.source);
        }
      };

      visit(nodeId);
      return visited;
    },
    [edges],
  );

  const executePartial = useCallback(
    async (nodeId: string) => {
      try {
        const runId = await ensureWorkflowRunForNodeExecution();
        const nodesToExecute = getAllParentNodes(nodeId);
        nodesToExecute.add(nodeId);
        await executeNodeSet(nodesToExecute);
        await completeWorkflowExecution(runId, "success");
        setWorkflowMessage(`Partial run completed. Run ID: ${runId}`);
      } catch (error) {
        const runId = currentRunIdRef.current;
        if (runId) {
          await completeWorkflowExecution(runId, "failed");
        }

        const message =
          error instanceof Error ? error.message : "Partial execution failed";
        setWorkflowMessage(message);
      } finally {
        currentRunIdRef.current = null;
        nodeRunIdsRef.current.clear();
        setHistoryRefreshKey((prev) => prev + 1);
      }
    },
    [
      completeWorkflowExecution,
      ensureWorkflowRunForNodeExecution,
      executeNodeSet,
      getAllParentNodes,
    ],
  );

  const nodesWithConnectionState = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        status: node.data.status ?? "idle",
        isInputConnected: edges.some((edge) => edge.target === node.id),
        connectedHandles: getConnectedInputHandles(node.id, edges),
        onManualInputChange: handleManualInputChange,
        onSystemPromptChange: handleSystemPromptChange,
        onUserMessageChange: handleUserMessageChange,
        onImageUpload: handleImageUpload,
        onVideoUpload: handleVideoUpload,
        onRunSingle: runSingleNode,
        onRunPartial: executePartial,
        onDeleteNode: handleDeleteNode,
      },
    }));
  }, [
    edges,
    executePartial,
    handleDeleteNode,
    getConnectedInputHandles,
    handleImageUpload,
    handleManualInputChange,
    handleSystemPromptChange,
    handleUserMessageChange,
    handleVideoUpload,
    nodes,
    runSingleNode,
  ]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) => {
        if (!connection.source || !connection.target) {
          setWorkflowMessage("Invalid connection type");
          return currentEdges;
        }

        const sourceNode = nodesRef.current.find(
          (node) => node.id === connection.source,
        );
        const targetNode = nodesRef.current.find(
          (node) => node.id === connection.target,
        );

        if (!sourceNode?.type || !targetNode?.type) {
          setWorkflowMessage("Invalid connection type");
          return currentEdges;
        }

        const isTypeCompatible = isConnectionTypeCompatible(
          sourceNode.type,
          targetNode.type,
        );

        if (!isTypeCompatible) {
          setWorkflowMessage("Invalid connection type");
          return currentEdges;
        }

        const candidateEdges = addEdge(connection, currentEdges);

        const cycleExists = hasDirectedCycle(
          nodesRef.current.map((node) => ({ id: node.id })),
          candidateEdges.map((edge) => ({
            source: edge.source,
            target: edge.target,
          })),
        );

        if (cycleExists) {
          setWorkflowMessage("This connection would create a cycle");
          return currentEdges;
        }

        return candidateEdges;
      });
    },
    [setEdges],
  );

  const applyLoadedWorkflow = useCallback(
    (loadedNodes: Node<NodeData, NodeType>[], loadedEdges: Edge[]) => {
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      nextNodeId.current = getNextNodeId(loadedNodes);
      nodesRef.current = loadedNodes;
      edgesRef.current = loadedEdges;
    },
    [setEdges, setNodes],
  );

  const saveWorkflow = useCallback(async () => {
    setIsSavingWorkflow(true);
    setWorkflowMessage("");

    try {
      const payload = {
        nodes: nodesRef.current,
        edges: edgesRef.current,
        name: workflowName.trim() || "Untitled Workflow",
      };

      if (workflowId.trim()) {
        const response = await fetch(`/api/workflow/${encodeURIComponent(workflowId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseBody = (await response.json()) as {
          success?: boolean;
          error?: string;
        };

        if (!response.ok || !responseBody.success) {
          throw new Error(responseBody.error || "Failed to update workflow");
        }

        lastSavedSnapshotRef.current = getWorkflowSnapshot(
          nodesRef.current,
          edgesRef.current,
          workflowName,
        );
        setWorkflowMessage(`Saved workflow: ${workflowId}`);
      } else {
        const response = await fetch("/api/workflows", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseBody = (await response.json()) as {
          workflow?: { id?: string };
          error?: string;
        };

        const createdWorkflowId = responseBody.workflow?.id;

        if (!response.ok || !createdWorkflowId) {
          throw new Error(responseBody.error || "Failed to create workflow");
        }

        setWorkflowId(createdWorkflowId);
        window.localStorage.setItem(WORKFLOW_ID_STORAGE_KEY, createdWorkflowId);
        router.replace(`/builder?workflowId=${createdWorkflowId}`);
        lastSavedSnapshotRef.current = getWorkflowSnapshot(
          nodesRef.current,
          edgesRef.current,
          workflowName,
        );
        setWorkflowMessage(`Saved workflow: ${createdWorkflowId}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save workflow";
      setWorkflowMessage(message);
    } finally {
      setIsSavingWorkflow(false);
    }
  }, [getWorkflowSnapshot, router, workflowId, workflowName]);

  const loadWorkflow = useCallback(
    async (idToLoad: string) => {
      const trimmedId = idToLoad.trim();

      if (!trimmedId) {
        setWorkflowMessage("Enter a workflow ID to load");
        return;
      }

      isAutoSaveSuspendedRef.current = true;
      setIsLoadingWorkflow(true);
      setWorkflowMessage("");

      try {
        const response = await fetch(`/api/workflow/${encodeURIComponent(trimmedId)}`);
        const payload = (await response.json()) as {
          id?: string;
          nodes?: unknown;
          edges?: unknown;
          name?: string | null;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load workflow");
        }

        if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) {
          throw new Error("Invalid workflow data returned from API");
        }

        applyLoadedWorkflow(
          payload.nodes as Node<NodeData, NodeType>[],
          payload.edges as Edge[],
        );

        const resolvedId = payload.id ?? trimmedId;
        const resolvedName = payload.name?.trim() ? payload.name : "Untitled Workflow";
        setWorkflowId(resolvedId);
        setWorkflowName(resolvedName);
        window.localStorage.setItem(WORKFLOW_ID_STORAGE_KEY, resolvedId);
        setWorkflowMessage(`Loaded workflow: ${resolvedId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load workflow";
        setWorkflowMessage(message);
      } finally {
        isAutoSaveSuspendedRef.current = false;
        setIsLoadingWorkflow(false);
      }
    },
    [applyLoadedWorkflow],
  );

  useEffect(() => {
    isAutoSaveSuspendedRef.current = true;

    const workflowIdFromQuery = searchParams.get("workflowId")?.trim();

    if (workflowIdFromQuery) {
      setWorkflowId(workflowIdFromQuery);
      window.localStorage.setItem(WORKFLOW_ID_STORAGE_KEY, workflowIdFromQuery);
      void loadWorkflow(workflowIdFromQuery);
      return;
    }

    const templateIdFromQuery = searchParams.get("templateId")?.trim();

    if (templateIdFromQuery) {
      const template = getWorkflowTemplateById(templateIdFromQuery);

      if (!template) {
        setWorkflowMessage(`Template not found: ${templateIdFromQuery}`);
        return;
      }

      applyLoadedWorkflow(
        template.nodes as Node<NodeData, NodeType>[],
        template.edges as Edge[],
      );

      setWorkflowId("");
      setWorkflowName(template.name || "Untitled Workflow");
      window.localStorage.removeItem(WORKFLOW_ID_STORAGE_KEY);
      setWorkflowMessage(`Loaded template: ${template.name}`);
      isAutoSaveSuspendedRef.current = false;
      return;
    }

    const isNewWorkflow = searchParams.get("new") === "1";

    if (isNewWorkflow) {
      applyLoadedWorkflow(emptyNodes, emptyEdges);
      setWorkflowId("");
      setWorkflowName("Untitled Workflow");
      window.localStorage.removeItem(WORKFLOW_ID_STORAGE_KEY);
      setWorkflowMessage("New workflow draft");
      isAutoSaveSuspendedRef.current = false;
      return;
    }

    const storedWorkflowId = window.localStorage.getItem(WORKFLOW_ID_STORAGE_KEY);

    if (!storedWorkflowId) {
      isAutoSaveSuspendedRef.current = false;
      return;
    }

    setWorkflowId(storedWorkflowId);
    void loadWorkflow(storedWorkflowId);
  }, [applyLoadedWorkflow, loadWorkflow, searchParams]);

  useEffect(() => {
    const currentSnapshot = getWorkflowSnapshot(nodes, edges, workflowName);

    if (isAutoSaveSuspendedRef.current) {
      lastSavedSnapshotRef.current = currentSnapshot;
      return;
    }

    if (!lastSavedSnapshotRef.current) {
      lastSavedSnapshotRef.current = currentSnapshot;
      return;
    }

    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      setWorkflowMessage("Saving...");
      void saveWorkflow();
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [edges, getWorkflowSnapshot, nodes, saveWorkflow, workflowName]);

  const addNode = useCallback((type: NodeType) => {
    const id = String(nextNodeId.current);
    const index = nextNodeId.current - 1;

    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id,
        type,
        position: {
          x: 120 + (index % 3) * 320,
          y: 140 + Math.floor(index / 3) * 190,
        },
        data: { label: `Node ${id}`, status: "idle" },
      },
    ]);

    nextNodeId.current += 1;
  }, [setNodes]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#07090f] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(67,97,238,0.08),transparent_34%),radial-gradient(circle_at_80%_75%,rgba(56,189,248,0.08),transparent_30%)]" />

      {/* Left Sidebar - Nodes */}
      <aside className="group absolute left-4 top-1/2 z-20 w-[84px] -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-300 hover:w-[248px]">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-zinc-100">Nodes</h2>
        <div className="flex flex-col gap-2">
          {sidebarItems.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => {
                addNode(item.type);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-left text-zinc-100 transition-colors hover:border-cyan-300/30 hover:bg-white/15"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-cyan-100">
                {item.icon}
              </span>
              <span className="pointer-events-none whitespace-nowrap text-sm text-zinc-200 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Top Workflow Bar */}
      <div
        className="absolute left-4 top-4 z-20 transition-[right] duration-300"
        style={{
          right: isHistoryOpen ? "404px" : "1rem",
        }}
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-1.5 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={workflowName}
              onChange={(event) => setWorkflowName(event.target.value)}
              placeholder="Untitled Workflow"
              className="h-7 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold text-zinc-100 outline-none transition-all placeholder:text-zinc-500 focus:border-cyan-300/40 focus:bg-white/5"
            />

            <button
              type="button"
              onClick={() => void executeWorkflow()}
              className="h-7 rounded-lg border border-cyan-300/30 bg-cyan-400/15 px-2.5 text-[11px] font-semibold text-cyan-100 transition-all hover:bg-cyan-400/25 hover:border-cyan-300/50"
            >
              Run Workflow
            </button>

            <button
              type="button"
              onClick={() => void reactFlowInstanceRef.current?.zoomIn({ duration: 180 })}
              className="h-7 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-zinc-100 transition-all hover:bg-white/10"
              title="Zoom in"
            >
              +
            </button>

            <button
              type="button"
              onClick={() => void reactFlowInstanceRef.current?.zoomOut({ duration: 180 })}
              className="h-7 rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-zinc-100 transition-all hover:bg-white/10"
              title="Zoom out"
            >
              -
            </button>

            <button
              type="button"
              onClick={() =>
                void reactFlowInstanceRef.current?.fitView({ duration: 220, padding: 0.6 })
              }
              className="h-7 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[11px] font-medium text-zinc-100 transition-all hover:bg-white/10"
            >
              Fit
            </button>

            <button
              type="button"
              onClick={() => void saveWorkflow()}
              disabled={isSavingWorkflow}
              className="h-7 rounded-lg border border-cyan-300/30 bg-cyan-400/15 px-3 text-[11px] font-semibold text-cyan-100 transition-all hover:bg-cyan-400/25 hover:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingWorkflow ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodesWithConnectionState}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        zoomOnScroll
        noWheelClassName="nowheel"
        onInit={(instance) => {
          reactFlowInstanceRef.current = instance;
        }}
        nodeTypes={nodeTypes}
        minZoom={0.2}
        fitView
        fitViewOptions={{ padding: 0.6 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.2}
          color="rgba(226, 232, 240, 0.2)"
        />
        <MiniMap
          pannable
          zoomable
          className="!rounded-xl !border !border-white/10 !bg-black/50 !backdrop-blur-xl"
        />
      </ReactFlow>

      <HistorySidebar
        workflowId={workflowId}
        isOpen={isHistoryOpen}
        refreshKey={historyRefreshKey}
        onToggle={() => setIsHistoryOpen((currentValue) => !currentValue)}
      />
    </div>
  );
}
