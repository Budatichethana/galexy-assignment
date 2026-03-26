"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  MiniMap,
  type Node,
  Panel,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  nodeTypes,
  type NodeData,
  type NodeStatus,
  type NodeType,
} from "@/components/nodes";
import { HistorySidebar } from "@/components/HistorySidebar";

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

const initialNodes: Node<NodeData, NodeType>[] = [
  {
    id: "1",
    type: "text",
    position: { x: 120, y: 140 },
    data: { label: "Node 1", status: "idle" },
  },
  {
    id: "2",
    type: "llm",
    position: { x: 560, y: 240 },
    data: { label: "Node 2", status: "idle" },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
  },
];

const WORKFLOW_ID_STORAGE_KEY = "nextflow:workflowId";

function getNextNodeId(nodeList: Array<{ id: string }>) {
  const maxNumericId = nodeList.reduce((maxValue, node) => {
    const numericId = Number.parseInt(node.id, 10);
    return Number.isNaN(numericId) ? maxValue : Math.max(maxValue, numericId);
  }, 0);

  return maxNumericId + 1;
}

export default function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [workflowId, setWorkflowId] = useState("");
  const [workflowMessage, setWorkflowMessage] = useState("");
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(false);
  const nextNodeId = useRef(3);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  
  // Execution tracking
  const currentRunIdRef = useRef<string | null>(null);
  const nodeRunIdsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

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

  const getNodeInputs = useCallback(
    (
      nodeId: string,
      nodeList: Node<NodeData>[] = nodesRef.current,
      edgeList: Edge[] = edgesRef.current,
    ) => {
      return edgeList
        .filter((edge) => edge.target === nodeId)
        .map((edge) => {
          const sourceNode = nodeList.find((node) => node.id === edge.source);
          return sourceNode?.data.output?.trim();
        })
        .filter((output): output is string => Boolean(output));
    },
    [],
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

        const chainedInputs = getNodeInputs(nodeId, currentNodes, edgesRef.current);
        const manualInput = targetNode.data.manualInput ?? "";
        const prompt = [
          ...chainedInputs,
          manualInput.trim(),
          targetNode.data.userMessage?.trim() ?? "",
          targetNode.data.label?.trim() ?? "",
        ]
          .filter(Boolean)
          .join("\n")
          .trim();

        // Log node execution start
        const runId = currentRunIdRef.current;
        if (runId) {
          const initResponse = await fetch("/api/node-run/init", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              runId,
              nodeId,
              nodeType: targetNode.type,
              input: { prompt },
            }),
          });

          if (initResponse.ok) {
            const { nodeRunId } = (await initResponse.json()) as { nodeRunId: string };
            nodeRunIdsRef.current.set(nodeId, nodeRunId);
          }
        }

        const response = await fetch("/api/run-node", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error("Task execution failed");
        }

        const result = (await response.json()) as { output?: string };
        const outputText = result.output?.trim() || "No output";

        // Log node execution success
        const nodeRunId = nodeRunIdsRef.current.get(nodeId);
        if (nodeRunId && runId) {
          await fetch(`/api/node-run/${nodeRunId}/complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ output: outputText }),
          });
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
        // Log node execution failure
        const nodeRunId = nodeRunIdsRef.current.get(nodeId);
        const runId = currentRunIdRef.current;
        if (nodeRunId && runId) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await fetch(`/api/node-run/${nodeRunId}/fail`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ error: errorMessage }),
          });
        }

        setNodeStatus(nodeId, "failed");
      }
    },
    [getNodeInputs, setNodeStatus, setNodes],
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
        await Promise.all(currentLevel.map((nodeId) => runNode(nodeId)));

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

  const executeWorkflow = useCallback(async () => {
    try {
      // Initialize workflow run
      if (!workflowId) {
        setWorkflowMessage("Please save workflow first");
        return;
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

      try {
        // Execute all nodes
        await executeNodeSet(new Set(nodes.map((node) => node.id)));

        // Complete workflow run
        await fetch(`/api/workflow-run/${runId}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "success" }),
        });

        setWorkflowMessage(`Workflow completed. Run ID: ${runId}`);
      } catch (error) {
        // Mark workflow as failed
        await fetch(`/api/workflow-run/${runId}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "failed" }),
        });

        throw error;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Workflow execution failed";
      setWorkflowMessage(message);
    }
  }, [executeNodeSet, nodes, workflowId]);

  const runSingleNode = useCallback(
    async (nodeId: string) => {
      await executeNodeSet(new Set([nodeId]));
    },
    [executeNodeSet],
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
      const nodesToExecute = getAllParentNodes(nodeId);
      nodesToExecute.add(nodeId);
      await executeNodeSet(nodesToExecute);
    },
    [executeNodeSet, getAllParentNodes],
  );

  const nodesWithConnectionState = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        status: node.data.status ?? "idle",
        isInputConnected: edges.some((edge) => edge.target === node.id),
        onManualInputChange: handleManualInputChange,
        onSystemPromptChange: handleSystemPromptChange,
        onUserMessageChange: handleUserMessageChange,
        onRunSingle: runSingleNode,
        onRunPartial: executePartial,
        onDeleteNode: handleDeleteNode,
      },
    }));
  }, [
    edges,
    executePartial,
    handleDeleteNode,
    handleManualInputChange,
    handleSystemPromptChange,
    handleUserMessageChange,
    nodes,
    runSingleNode,
  ]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) => addEdge(connection, currentEdges));
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
      const response = await fetch("/api/workflow/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodes: nodesRef.current,
          edges: edgesRef.current,
        }),
      });

      const payload = (await response.json()) as {
        workflowId?: string;
        error?: string;
      };

      if (!response.ok || !payload.workflowId) {
        throw new Error(payload.error || "Failed to save workflow");
      }

      setWorkflowId(payload.workflowId);
      window.localStorage.setItem(WORKFLOW_ID_STORAGE_KEY, payload.workflowId);
      setWorkflowMessage(`Saved workflow: ${payload.workflowId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save workflow";
      setWorkflowMessage(message);
    } finally {
      setIsSavingWorkflow(false);
    }
  }, []);

  const loadWorkflow = useCallback(
    async (idToLoad: string) => {
      const trimmedId = idToLoad.trim();

      if (!trimmedId) {
        setWorkflowMessage("Enter a workflow ID to load");
        return;
      }

      setIsLoadingWorkflow(true);
      setWorkflowMessage("");

      try {
        const response = await fetch(`/api/workflow/${encodeURIComponent(trimmedId)}`);
        const payload = (await response.json()) as {
          id?: string;
          nodes?: unknown;
          edges?: unknown;
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
        setWorkflowId(resolvedId);
        window.localStorage.setItem(WORKFLOW_ID_STORAGE_KEY, resolvedId);
        setWorkflowMessage(`Loaded workflow: ${resolvedId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load workflow";
        setWorkflowMessage(message);
      } finally {
        setIsLoadingWorkflow(false);
      }
    },
    [applyLoadedWorkflow],
  );

  useEffect(() => {
    const storedWorkflowId = window.localStorage.getItem(WORKFLOW_ID_STORAGE_KEY);

    if (!storedWorkflowId) {
      return;
    }

    setWorkflowId(storedWorkflowId);
    void loadWorkflow(storedWorkflowId);
  }, [loadWorkflow]);

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
      <aside className="group absolute left-4 top-4 z-20 w-[84px] overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.3)] transition-all duration-300 hover:w-[248px]">
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

      {/* Top Workflow Card - compact and collision-safe */}
      <div
        className="absolute left-1/2 top-4 z-20 -translate-x-1/2 transition-[width] duration-300"
        style={{
          width: isHistoryOpen
            ? "min(760px, calc(100vw - 540px))"
            : "min(800px, calc(100vw - 220px))",
        }}
      >
        <div className="rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-12 items-center gap-1.5">
            <p className="col-span-2 text-[11px] font-semibold tracking-wide text-zinc-100">Workflow</p>

            {/* Workflow ID Display */}
            <div className="col-span-4">
              <input
                type="text"
                value={workflowId}
                onChange={(event) => setWorkflowId(event.target.value)}
                placeholder="Workflow ID or new workflow"
                className="h-7 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 text-[11px] text-zinc-200 outline-none transition-all placeholder:text-zinc-500 focus:border-cyan-300/50 focus:bg-white/10"
              />
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={() => void saveWorkflow()}
              disabled={isSavingWorkflow}
              className="col-span-2 h-7 rounded-lg border border-cyan-300/30 bg-cyan-400/15 px-1.5 text-[11px] font-semibold text-cyan-100 transition-all hover:bg-cyan-400/25 hover:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingWorkflow ? "Saving..." : "Save"}
            </button>

            {/* Load Button */}
            <button
              type="button"
              onClick={() => void loadWorkflow(workflowId)}
              disabled={isLoadingWorkflow}
              className="col-span-2 h-7 rounded-lg border border-white/10 bg-white/5 px-1.5 text-[11px] font-medium text-zinc-200 transition-all hover:bg-white/10 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingWorkflow ? "Loading..." : "Load"}
            </button>

            {/* Share Button */}
            <button
              type="button"
              className="col-span-1 h-7 rounded-lg border border-white/10 bg-white/5 px-1.5 text-[11px] font-medium text-zinc-200 transition-all hover:bg-white/10 hover:border-white/20"
              title="Share workflow"
            >
              ↗
            </button>

            {/* Deploy Button */}
            <button
              type="button"
              className="col-span-1 h-7 rounded-lg border border-white/10 bg-white/5 px-1.5 text-[11px] font-medium text-zinc-200 transition-all hover:bg-white/10 hover:border-white/20"
              title="Deploy workflow"
            >
              ✓
            </button>
          </div>

          {/* Status Message */}
          {workflowMessage ? (
            <p className="mt-2 text-[11px] text-cyan-300 font-mono">{workflowMessage}</p>
          ) : null}
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
        <Panel position="bottom-center">
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <button
              type="button"
              onClick={() => void executeWorkflow()}
              className="rounded-lg border border-cyan-300/30 bg-cyan-400/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition-all hover:bg-cyan-400/25 hover:border-cyan-300/50"
            >
              Run Workflow
            </button>
            <button
              type="button"
              onClick={() => void reactFlowInstanceRef.current?.zoomIn({ duration: 180 })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 transition-all hover:bg-white/10"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => void reactFlowInstanceRef.current?.zoomOut({ duration: 180 })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 transition-all hover:bg-white/10"
            >
              −
            </button>
            <button
              type="button"
              onClick={() =>
                void reactFlowInstanceRef.current?.fitView({ duration: 220, padding: 0.6 })
              }
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 transition-all hover:bg-white/10"
            >
              Fit
            </button>
          </div>
        </Panel>
      </ReactFlow>

      <HistorySidebar
        workflowId={workflowId}
        isOpen={isHistoryOpen}
        onToggle={() => setIsHistoryOpen((currentValue) => !currentValue)}
      />
    </div>
  );
}
