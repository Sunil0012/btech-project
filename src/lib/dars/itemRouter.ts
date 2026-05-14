/**
 * Knowledge Graph and Item Routing
 * Implements graph-based adaptive item recommendation
 */

export interface KnowledgeGraphNode {
  itemId: string;
  domain: string;
  topic: string;
  difficulty: number; // 0-1 scale
  centrality: number; // 0-1 scale (betweenness centrality)
  baseDifficulty: "easy" | "medium" | "hard";
}

export interface KnowledgeGraphEdge {
  sourceId: string;
  targetId: string;
  type: "same_topic" | "domain_flow" | "domain_bridge";
  weight: number; // 0-1, lower = closer
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  nodeMap: Map<string, KnowledgeGraphNode>;
  adjacencyList: Map<string, Set<string>>;
}

export interface TargetPolicy {
  targetRating: number;
  targetTier: "Bronze" | "Silver" | "Gold" | "Platinum";
  momentum: "hot" | "steady" | "cold";
}

export interface RecommendationContext {
  learnerRating: number;
  momentum: "hot" | "steady" | "cold";
  answeredCount: number;
  provisionalItems: number;
  weakTopics: Set<string>;
  answeredItems: Set<string>;
  servedItems: Set<string>;
  remediationActive: boolean;
  remediationSourceId?: string;
}

export interface RecommendedItem {
  itemId: string;
  reason: string[];
  heuristic_score: number;
  graph_boost: number;
  combined_score: number;
  hopDistance: number;
  targetRating: number;
}

class ItemRouter {
  private graph: KnowledgeGraph;
  private hopLimit = 2;
  private remediationHopLimit = 3;

  constructor(graph: KnowledgeGraph) {
    this.graph = graph;
  }

  /**
   * Compute target rating based on momentum
   */
  private computeTargetRating(
    currentRating: number,
    momentum: "hot" | "steady" | "cold"
  ): number {
    switch (momentum) {
      case "hot":
        return currentRating + 100;
      case "steady":
        return currentRating + 50;
      case "cold":
        return currentRating - 100;
    }
  }

  /**
   * Get standard neighborhood (items within hop distance)
   */
  private getStandardNeighborhood(
    lastItemId: string,
    hopLimit: number,
    answeredItems: Set<string>,
    servedItems: Set<string>
  ): Map<string, number> {
    const neighborhood = new Map<string, number>();
    const visited = new Set<string>();
    const queue: [string, number][] = [[lastItemId, 0]];

    while (queue.length > 0) {
      const [currentId, distance] = queue.shift()!;
      if (visited.has(currentId) || distance > hopLimit) continue;
      visited.add(currentId);

      const neighbors = this.graph.adjacencyList.get(currentId) || new Set();
      neighbors.forEach((neighborId) => {
        if (
          !answeredItems.has(neighborId) &&
          !servedItems.has(neighborId) &&
          neighborId !== lastItemId
        ) {
          neighborhood.set(neighborId, distance + 1);
          if (distance + 1 <= hopLimit) {
            queue.push([neighborId, distance + 1]);
          }
        }
      });
    }

    return neighborhood;
  }

  /**
   * Get remediation neighborhood (easier related items)
   */
  private getRemediationNeighborhood(
    missedItemId: string,
    hopLimit: number,
    answeredItems: Set<string>,
    servedItems: Set<string>
  ): Map<string, number> {
    const missedNode = this.graph.nodeMap.get(missedItemId);
    if (!missedNode) return new Map();

    const neighborhood = new Map<string, number>();
    const visited = new Set<string>();
    const queue: [string, number][] = [[missedItemId, 0]];

    while (queue.length > 0) {
      const [currentId, distance] = queue.shift()!;
      if (visited.has(currentId) || distance > hopLimit) continue;
      visited.add(currentId);

      const neighbors = this.graph.adjacencyList.get(currentId) || new Set();
      neighbors.forEach((neighborId) => {
        const neighborNode = this.graph.nodeMap.get(neighborId);
        if (
          neighborNode &&
          !answeredItems.has(neighborId) &&
          !servedItems.has(neighborId) &&
          neighborNode.difficulty < missedNode.difficulty
        ) {
          neighborhood.set(neighborId, distance + 1);
          if (distance + 1 <= hopLimit) {
            queue.push([neighborId, distance + 1]);
          }
        }
      });
    }

    return neighborhood;
  }

  /**
   * Compute heuristic score (topic relevance and difficulty alignment)
   */
  private computeHeuristicScore(
    candidateId: string,
    targetRating: number,
    weakTopics: Set<string>,
    weakTopicBonus: number = 0.15,
    typeBonus: number = 0.05
  ): number {
    const node = this.graph.nodeMap.get(candidateId);
    if (!node) return 0;

    // Difficulty distance component
    const diffDist = Math.abs(node.difficulty - targetRating / 3000); // Normalize to 0-1
    const diffComponent = 1 - diffDist;

    // Weak topic bonus
    const topicComponent = weakTopics.has(node.topic) ? weakTopicBonus : 0;

    return diffComponent + topicComponent;
  }

  /**
   * Compute graph structural boost
   */
  private computeGraphBoost(
    candidateId: string,
    inDegreeWeight: number = 0.3,
    outDegreeWeight: number = 0.3,
    centralityWeight: number = 0.4
  ): number {
    const node = this.graph.nodeMap.get(candidateId);
    if (!node) return 0;

    // In/out degree approximation (using adjacency list)
    const inDegree = Array.from(this.graph.adjacencyList.values()).filter((set) =>
      set.has(candidateId)
    ).length;
    const outDegree = this.graph.adjacencyList.get(candidateId)?.size || 0;
    const maxDegree = Math.max(1, this.graph.nodes.length);

    const inComponent = (inDegree / maxDegree) * inDegreeWeight;
    const outComponent = (outDegree / maxDegree) * outDegreeWeight;
    const centralityComponent = node.centrality * centralityWeight;

    return inComponent + outComponent + centralityComponent;
  }

  /**
   * Main item recommendation algorithm
   */
  public recommendItem(context: RecommendationContext): RecommendedItem | null {
    const candidateMap = context.remediationActive
      ? this.getRemediationNeighborhood(
          context.remediationSourceId || "",
          this.remediationHopLimit,
          context.answeredItems,
          context.servedItems
        )
      : this.getStandardNeighborhood(
          "", // Last item would be passed in real context
          this.hopLimit,
          context.answeredItems,
          context.servedItems
        );

    if (candidateMap.size === 0) {
      // Fallback: unfiltered items nearest to target
      return this.recommendFallback(
        context.learnerRating,
        context.answeredItems,
        context.servedItems
      );
    }

    const targetRating = this.computeTargetRating(context.learnerRating, context.momentum);
    const provisionalProgress = Math.min(1, context.answeredCount / context.provisionalItems);

    // Score candidates
    const scored = Array.from(candidateMap.entries()).map(([itemId, hopDistance]) => {
      const heuristicScore = this.computeHeuristicScore(
        itemId,
        targetRating,
        context.weakTopics
      );
      const graphBoost = this.computeGraphBoost(itemId);
      // Down-weight graph during provisional phase
      const provisionAdjust = Math.min(1, provisionalProgress);
      const combinedScore = heuristicScore + graphBoost * provisionAdjust;

      return {
        itemId,
        hopDistance,
        heuristicScore,
        graphBoost,
        combinedScore,
      };
    });

    // Select best
    const best = scored.reduce((prev, curr) =>
      curr.combinedScore > prev.combinedScore ? curr : prev
    );

    const node = this.graph.nodeMap.get(best.itemId);
    return {
      itemId: best.itemId,
      reason: [
        `Hop distance: ${best.hopDistance}`,
        `Heuristic score: ${best.heuristicScore.toFixed(3)}`,
        `Graph boost: ${best.graphBoost.toFixed(3)}`,
        context.momentum === "hot" ? "On a hot streak" : 
        context.momentum === "cold" ? "On a cold streak" : 
        "Steady performance",
      ],
      heuristic_score: best.heuristicScore,
      graph_boost: best.graphBoost,
      combined_score: best.combinedScore,
      hopDistance: best.hopDistance,
      targetRating: targetRating,
    };
  }

  /**
   * Fallback recommendation
   */
  private recommendFallback(
    learnerRating: number,
    answeredItems: Set<string>,
    servedItems: Set<string>
  ): RecommendedItem | null {
    const unanswered = this.graph.nodes.filter(
      (node) => !answeredItems.has(node.itemId) && !servedItems.has(node.itemId)
    );

    if (unanswered.length === 0) return null;

    // Sort by distance to learner rating
    const sorted = unanswered.sort(
      (a, b) =>
        Math.abs(a.difficulty - learnerRating / 3000) - Math.abs(b.difficulty - learnerRating / 3000)
    );

    const best = sorted[0];
    return {
      itemId: best.itemId,
      reason: ["Fallback: nearest unanswered item by rating"],
      heuristic_score: 1 - Math.abs(best.difficulty - learnerRating / 3000),
      graph_boost: 0,
      combined_score: 1 - Math.abs(best.difficulty - learnerRating / 3000),
      hopDistance: 0,
      targetRating: learnerRating,
    };
  }

  /**
   * Export graph statistics
   */
  public getGraphStats() {
    return {
      totalItems: this.graph.nodes.length,
      totalEdges: this.graph.edges.length,
      avgCentrality: this.graph.nodes.reduce((sum, n) => sum + n.centrality, 0) / this.graph.nodes.length,
      topicCount: new Set(this.graph.nodes.map((n) => n.topic)).size,
      domainCount: new Set(this.graph.nodes.map((n) => n.domain)).size,
    };
  }
}

export function createItemRouter(graph: KnowledgeGraph): ItemRouter {
  return new ItemRouter(graph);
}

export function buildKnowledgeGraphFromItems(items: any[]): KnowledgeGraph {
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];
  const nodeMap = new Map<string, KnowledgeGraphNode>();
  const adjacencyList = new Map<string, Set<string>>();

  // Build nodes from items
  items.forEach((item) => {
    const node: KnowledgeGraphNode = {
      itemId: item.id,
      domain: item.domain || "general",
      topic: item.topic || "uncategorized",
      difficulty: this.difficultyToNumber(item.difficulty),
      centrality: item.centrality || 0.5,
      baseDifficulty: item.difficulty,
    };
    nodes.push(node);
    nodeMap.set(node.itemId, node);
    adjacencyList.set(node.itemId, new Set());
  });

  // Build edges based on topic/domain relationships
  nodes.forEach((sourceNode) => {
    nodes.forEach((targetNode) => {
      if (sourceNode.itemId === targetNode.itemId) return;

      let edgeType: "same_topic" | "domain_flow" | "domain_bridge";
      let weight: number;

      if (sourceNode.topic === targetNode.topic) {
        edgeType = "same_topic";
        weight = 0.2;
      } else if (sourceNode.domain === targetNode.domain) {
        edgeType = "domain_flow";
        weight = 0.5;
      } else {
        edgeType = "domain_bridge";
        weight = 0.8;
      }

      edges.push({ sourceId: sourceNode.itemId, targetId: targetNode.itemId, type: edgeType, weight });
      adjacencyList.get(sourceNode.itemId)?.add(targetNode.itemId);
    });
  });

  return { nodes, edges, nodeMap, adjacencyList };
}

private function difficultyToNumber(difficulty: string): number {
  switch (difficulty) {
    case "easy":
      return 1000;
    case "medium":
      return 1500;
    case "hard":
      return 2000;
    default:
      return 1500;
  }
}
