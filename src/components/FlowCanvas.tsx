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

const sidebarItems: Array<{ label: string; type: NodeType }> = [
  { label: "Text", type: "text" },
  { label: "Upload Image", type: "image" },
  { label: "Upload Video", type: "video" },
  { label: "LLM", type: "llm" },
  { label: "Crop Image", type: "crop" },
  { label: "Extract Frame", type: "frame" },
];

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

export default function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isNodeDropdownOpen, setIsNodeDropdownOpen] = useState(false);
  const nextNodeId = useRef(3);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

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
      } catch {
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
    await executeNodeSet(new Set(nodes.map((node) => node.id)));
  }, [executeNodeSet, nodes]);

  const runSingleNode = useCallback(
    async (nodeId: string) => {
      await executeNodeSet(new Set([nodeId]));
    },
    [executeNodeSet],
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
      },
    }));
  }, [
    edges,
    executePartial,
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

      <aside className="absolute left-4 top-4 z-20 w-56 rounded-2xl border border-white/15 bg-black/55 p-3 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-zinc-100">Nodes</h2>
        <div className="relative flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setIsNodeDropdownOpen((current) => !current);
            }}
            className="flex items-center justify-between rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-zinc-100 transition-colors hover:bg-white/15"
          >
            <span>Add Node</span>
            <span className="text-xs text-zinc-300">▼</span>
          </button>

          {isNodeDropdownOpen ? (
            <div className="absolute left-0 right-0 top-12 z-30 rounded-xl border border-white/15 bg-zinc-950/95 p-1 backdrop-blur-xl">
              {sidebarItems.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    addNode(item.type);
                    setIsNodeDropdownOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-100 transition-colors hover:bg-white/10"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </aside>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <button
          type="button"
          className="rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-xs font-medium text-zinc-200 backdrop-blur-xl transition-colors hover:bg-black/70"
        >
          Share
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/15 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-white"
        >
          Turn workflow into app
        </button>
      </div>

      <ReactFlow
        nodes={nodesWithConnectionState}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
          <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
            <button
              type="button"
              onClick={() => void executeWorkflow()}
              className="rounded-xl border border-white/20 bg-white/90 px-3 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-white"
            >
              Run Workflow
            </button>
            <button
              type="button"
              onClick={() => void reactFlowInstanceRef.current?.zoomIn({ duration: 180 })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 transition-colors hover:bg-white/15"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => void reactFlowInstanceRef.current?.zoomOut({ duration: 180 })}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 transition-colors hover:bg-white/15"
            >
              -
            </button>
            <button
              type="button"
              onClick={() =>
                void reactFlowInstanceRef.current?.fitView({ duration: 220, padding: 0.6 })
              }
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/15"
            >
              Fit
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
