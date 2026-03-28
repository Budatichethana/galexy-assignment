export type DagNode = { id: string };
export type DagEdge = { source: string; target: string };

/**
 * Returns true when the directed graph contains at least one cycle.
 * Uses DFS with 3-color marking and runs in O(V + E).
 */
export function hasDirectedCycle(nodes: DagNode[], edges: DagEdge[]): boolean {
  // Build adjacency list for all declared nodes.
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  // Add edges, including endpoints that may not be present in `nodes`.
  // This keeps behavior safe even if upstream data is slightly inconsistent.
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, []);
    }
    if (!adjacency.has(edge.target)) {
      adjacency.set(edge.target, []);
    }
    adjacency.get(edge.source)!.push(edge.target);
  }

  // 0 = unvisited, 1 = visiting (in recursion stack), 2 = done.
  const state = new Map<string, 0 | 1 | 2>();

  const dfs = (nodeId: string): boolean => {
    const currentState = state.get(nodeId) ?? 0;

    // Back-edge to a node in current DFS path => cycle found.
    if (currentState === 1) {
      return true;
    }

    // Already fully explored with no cycle from this node.
    if (currentState === 2) {
      return false;
    }

    state.set(nodeId, 1);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const nextId of neighbors) {
      if (dfs(nextId)) {
        return true;
      }
    }

    state.set(nodeId, 2);
    return false;
  };

  // Start DFS from every component to handle disconnected graphs.
  for (const nodeId of adjacency.keys()) {
    if ((state.get(nodeId) ?? 0) === 0 && dfs(nodeId)) {
      return true;
    }
  }

  return false;
}

/**
 * Example:
 * const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }];
 * const edges = [
 *   { source: "A", target: "B" },
 *   { source: "B", target: "C" },
 *   { source: "C", target: "A" },
 * ];
 * const hasCycle = hasDirectedCycle(nodes, edges); // true
 */
