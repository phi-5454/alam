import { MultiDirectedGraph } from "graphology";

const parseLPG = (text: string): MultiDirectedGraph => {
  const graph = new MultiDirectedGraph();
  const lines = text.split("\n");
  let currentNodeId: string | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Node Definition: # name { props }
    if (trimmed.startsWith("#")) {
      const match = trimmed.match(/^#\s*(\w+)\s*({.*})?$/);
      if (match) {
        const [, id, propsStr] = match;
        const props = propsStr ? JSON.parse(propsStr) : {};
        currentNodeId = id; // Set focus to this node for subsequent MD lines
        graph.mergeNode(id, {
          label: id,
          description: "", // Initialize MD content
          x: Math.random(),
          y: Math.random(),
          size: 20,
          ...props,
        });
      }
    }
    // Edge Definition
    else if (trimmed.includes("->")) {
      const edgeMatch = trimmed.match(
        /^(\w+)\s*-\[(\w+)\]->\s*(\w+)\s*({.*})?$/,
      );
      if (edgeMatch) {
        const [, source, label, target, propsStr] = edgeMatch;
        graph.addEdge(source, target, { label, size: 2, color: "#ccc" });
        currentNodeId = null; // Edges break the MD block for the previous node
      }
    }
    // Markdown Content (Anything else while a node is "active")
    else if (currentNodeId) {
      const currentDesc = graph.getNodeAttribute(currentNodeId, "description");
      graph.setNodeAttribute(
        currentNodeId,
        "description",
        currentDesc + "\n" + line,
      );
    }
  });
  return graph;
};
