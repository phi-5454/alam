import { useEffect, useState } from "react";
import { useSigma, useRegisterEvents } from "@react-sigma/core";

export const HoverEffect = () => {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();

  // Track which node is currently being hovered
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // 1. Listen for mouse enter/leave events
  useEffect(() => {
    registerEvents({
      enterNode: (event) => setHoveredNode(event.node),
      leaveNode: () => setHoveredNode(null),
    });
  }, [registerEvents]);

  // 2. Apply the visual Reducers when the hoveredNode changes
  useEffect(() => {
    const graph = sigma.getGraph();

    if (hoveredNode) {
      // Get all neighbors of the hovered node (the nodes it connects to, or that connect to it)
      const neighbors = new Set(graph.neighbors(hoveredNode));
      neighbors.add(hoveredNode); // Include the hovered node itself

      // Dim nodes that aren't neighbors
      sigma.setSetting("nodeReducer", (node, data) => {
        if (neighbors.has(node)) {
          return { ...data, zIndex: 1 }; // Highlighted nodes stay standard, pop to top layer
        }
        // Dimmed nodes become light gray and lose their text labels to reduce clutter
        return {
          ...data,
          color: "#e2e2e2",
          label: "", // Hide the text
          zIndex: 0,
        };
      });

      // Dim edges that aren't connected to the hovered node
      sigma.setSetting("edgeReducer", (edge, data) => {
        // graph.hasExtremity checks if the edge touches our hovered node
        if (graph.hasExtremity(edge, hoveredNode)) {
          return { ...data, size: 2, zIndex: 1 }; // Make connected edges slightly thicker
        }
        // Hide unconnected edges completely (or change color to a very faint "#f5f5f5")
        return { ...data, hidden: true };
      });
    } else {
      // If nothing is hovered, remove the reducers to restore the default view
      sigma.setSetting("nodeReducer", null as any);
      sigma.setSetting("edgeReducer", null as any);
    }
  }, [hoveredNode, sigma]);

  return null; // This component handles logic, it renders no DOM elements
};
