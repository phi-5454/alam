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

// 1. Our Markdown-compatible DSL string
// Note: Using strict JSON format {"key": "value"} for properties to ensure safe parsing
const rawGraphText = `
# --- PHYSICS CLUSTER ---

[electrons]
label = "Electrons"
color = "#FA4F40"
size = 25
link = "https://en.wikipedia.org/wiki/Electron"
description = """
# Electrons
Electrons are **subatomic particles** with a negative elementary electric charge. 
They belong to the first generation of the lepton particle family.
Key properties:
- Mass: 9.109 × 10⁻³¹ kg
- Charge: -1e
"""

[leptons]
label = "Leptons"
size = 20
description = "A subatomic particle, such as an electron, muon, or neutrino, which does not take part in the strong interaction."

[quarks]
label = "Quarks"
description = "Elementary particles and a fundamental constituent of matter. Quarks combine to form composite particles called hadrons."

[protons]
label = "Protons"
description = "A subatomic particle with a positive electric charge found in the nucleus of every atom."

[nucleus]
label = "Nucleus"
description = "The small, dense region consisting of protons and neutrons at the center of an atom."

[atoms]
label = "Atoms"
description = "The smallest unit of ordinary matter that forms a chemical element."

# --- PHILOSOPHY CLUSTER ---

[epistemology]
label = "Epistemology"
color = "#405CFA"
size = 25
description = """
# Epistemology
The theory of knowledge, especially with regard to its methods, validity, and scope. 
It is the investigation of what distinguishes justified belief from opinion.
"""

[empiricism]
label = "Empiricism"
description = "The theory that all knowledge is derived from sense-experience."

[rationalism]
label = "Rationalism"
description = "The theory that reason rather than experience is the foundation of certainty in knowledge."

[logic]
label = "Logic"
description = "Reasoning conducted or assessed according to strict principles of validity."

[science]
label = "Science"
size = 30
description = "A systematic enterprise that builds and organizes knowledge in the form of testable explanations and predictions."

# --- RELATIONSHIPS ---

[[relationships]]
source = "electrons"
target = "leptons"
type = "is_a"

[[relationships]]
source = "quarks"
target = "protons"
type = "composes"

[[relationships]]
source = "quarks"
target = "oatmeal"
type = "compose"

[[relationships]]
source = "oatmeal"
target = "science"
type = "feeds"

[[relationships]]
source = "protons"
target = "nucleus"
type = "part_of"

[[relationships]]
source = "nucleus"
target = "atoms"
type = "core_of"

[[relationships]]
source = "empiricism"
target = "epistemology"
type = "branch_of"

[[relationships]]
source = "rationalism"
target = "epistemology"
type = "branch_of"

[[relationships]]
source = "logic"
target = "epistemology"
type = "foundation_of"

[[relationships]]
source = "science"
target = "empiricism"
type = "utilizes"

# --- THE CROSS-DOMAIN BRIDGE ---
[[relationships]]
source = "science"
target = "atoms"
type = "investigates"
`;

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
const LoadData = () => {
  const loadGraph = useLoadGraph();

  useEffect(() => {
    const graph = parseLPG(rawGraphText);
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
  }, [loadGraph]);

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
export const GraphView: React.FC = () => {
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
        <LoadData />
        <SearchBar className="bg-black" />
        <NodeInspector />
        <HoverEffect />
      </SigmaContainer>
    </div>
  );
};
