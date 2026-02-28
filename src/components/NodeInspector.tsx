import { useState, useEffect } from "react";
import { useRegisterEvents, useSigma } from "@react-sigma/core";
import ReactMarkdown from "react-markdown";

export const NodeInspector = () => {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  useEffect(() => {
    // 1. Get the graph instance
    const graph = sigma.getGraph();

    registerEvents({
      clickNode: (event) => {
        // 'event.node' is the ID (e.g., "electrons" or "empiricism")
        const nodeId = event.node;

        // 2. Fetch the attributes from the graph using that ID
        if (graph.hasNode(nodeId)) {
          const attrs = graph.getNodeAttributes(nodeId);
          setSelectedNodeData(attrs);
        }
      },
      // Optional: Clear selection when clicking the stage (background)
      clickStage: () => {
        setSelectedNodeData(null);
      },
    });
  }, [registerEvents, sigma]);

  if (!selectedNodeData) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: "20px",
        top: "20px",
        width: "350px",
        maxHeight: "80vh",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        padding: "25px",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        overflowY: "auto",
        zIndex: 1000,
        border: "1px solid #eee",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h2
          className="text-2xl"
          style={{ margin: 0, color: selectedNodeData.color || "#333" }}
        >
          {selectedNodeData.label}
        </h2>
        <button
          className="text-black"
          onClick={() => setSelectedNodeData(null)}
          style={{
            cursor: "pointer",
            border: "none",
            background: "none",
            fontSize: "20px",
          }}
        >
          ×
        </button>
      </div>
      <div className="my-3">
        <a target="blank" href={selectedNodeData.link}>
          {selectedNodeData.link}
        </a>
      </div>
      <hr style={{ border: "0.5px solid #eee" }} />
      <div
        className="markdown-content"
        style={{ lineHeight: "1.6", color: "#444" }}
      >
        <ReactMarkdown>
          {selectedNodeData.description ||
            "_No additional notes for this node._"}
        </ReactMarkdown>
      </div>
    </div>
  );
};
