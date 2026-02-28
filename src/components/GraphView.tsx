import React, { useEffect } from "react";
import { parse } from "smol-toml";
import { MultiDirectedGraph } from "graphology";
import { SigmaContainer, useLoadGraph } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import louvain from "graphology-communities-louvain";
import forceAtlas2 from "graphology-layout-forceatlas2";
import Fuse from "fuse.js";
import { SearchBar } from "./SearchBar";
import { NodeInspector } from "./NodeInspector";
import { HoverEffect } from "./HoverEffect";

interface GraphViewProps {
  tomlString: string;
}

// 2. The Parser
const parseLPG = (tomlString: string): MultiDirectedGraph => {
  const graph = new MultiDirectedGraph();
  const data = parse(tomlString) as any;

  // 1. First, process explicit Node Tables
  Object.keys(data).forEach((key) => {
    if (key === "relationships") return;
    const nodeData = data[key];

    graph.mergeNode(key, {
      label: nodeData.label || key,
      description: nodeData.description || "",
      color: nodeData.color || "#4A90E2", // Default Blue for defined nodes
      size: 20,
      x: Math.random(),
      y: Math.random(),
      isPlaceholder: false, // Flag to distinguish "fleshed out" nodes
      ...nodeData,
    });
  });

  // 2. Then, process Relationships (The Auto-Creator)
  if (data.relationships) {
    data.relationships.forEach((rel: any) => {
      // mergeNode will ONLY create if the ID doesn't exist.
      // If it exists (from step 1), it leaves it alone.
      graph.mergeNode(rel.source, {
        label: rel.source,
        color: "#CCCCCC", // Grey for "placeholder" nodes
        size: 12, // Smaller size for placeholders
        isPlaceholder: true,
        x: Math.random(),
        y: Math.random(),
      });

      graph.mergeNode(rel.target, {
        label: rel.target,
        color: "#CCCCCC",
        size: 12,
        isPlaceholder: true,
        x: Math.random(),
        y: Math.random(),
      });

      graph.addEdge(rel.source, rel.target, {
        label: rel.type || "related",
        size: 4,
        color: "#ccc",
      });
    });
  }

  return graph;
};

// 3. The Data Loader Component
const LoadData: React.FC<{ tomlString: string }> = ({ tomlString }) => {
  const loadGraph = useLoadGraph();

  useEffect(() => {
    if (!tomlString) return;
    // 1. Parse the TOML (using your smol-toml setup)
    const graph = parseLPG(tomlString);
    console.log(
      "Parsed Graph Nodes:",
      graph.nodes().map((n) => ({
        id: n,
        desc: graph.getNodeAttribute(n, "description"),
      })),
    );
    loadGraph(graph);

    // 2. Run Louvain community detection
    // This automatically creates a "community" attribute on every node (an integer: 0, 1, 2...)
    louvain.assign(graph);

    // 3. Colorize the nodes based on their new community
    const clusterColors = [
      "#FA4F40", // Red
      "#405CFA", // Blue
      "#5CFA40", // Green
      "#FACC40", // Yellow
      "#A040FA", // Purple
    ];

    graph.forEachNode((node, attributes) => {
      // Assign a color from our palette based on the community integer
      const colorIndex = attributes.community % clusterColors.length;
      graph.setNodeAttribute(node, "color", clusterColors[colorIndex]);
    });

    // 4. Run the physics layout (ForceAtlas2 naturally groups communities together!)
    forceAtlas2.assign(graph, {
      iterations: 100,
      settings: {
        gravity: 1,
        scalingRatio: 1,
      },
    });

    // 5. Load the clustered, color-coded graph into Sigma
    loadGraph(graph);
  }, [loadGraph, tomlString]);

  return null;
};
// Custom canvas renderer for node labels
const drawLabelInside = (
  context: CanvasRenderingContext2D,
  data: any, // Note: Use Partial<NodeDisplayData> if you want strict typing
  //#settings: any,
) => {
  if (!data.label) return;

  const fontSize = 14;
  context.font = `600 ${fontSize}px Inter, sans-serif`;

  // Center the text horizontally and vertically
  context.textAlign = "center";
  context.textBaseline = "middle";

  // Make the text white so it contrasts with the colored nodes
  context.fillStyle = "#000000";

  // Draw the text at the exact center of the node
  context.fillText(data.label, data.x, data.y);
};

// 4. The Main View Component
export const GraphView: React.FC<GraphViewProps> = ({ tomlString }) => {
  return (
    <div
      style={{ height: "100vh", width: "100vw", backgroundColor: "#1e1e1e" }}
    >
      <SigmaContainer
        style={{ height: "100%", width: "100%" }}
        settings={{
          allowInvalidContainer: true,
          defaultNodeType: "circle",
          defaultEdgeType: "arrow",
          renderEdgeLabels: true,

          // 1. Tell Sigma to use our custom function for standard labels
          defaultDrawNodeLabel: drawLabelInside,

          // 2. (Optional) Disable Sigma's default hover effect,
          // or leave it as default so the text "pops out" when hovered!
          // defaultDrawNodeHover: drawLabelInside,
        }}
      >
        <LoadData tomlString={tomlString} />
        <SearchBar />
        <NodeInspector />
        <HoverEffect />
      </SigmaContainer>
    </div>
  );
};
