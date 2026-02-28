import Fuse from "fuse.js";
import { useSigma, useCamera } from "@react-sigma/core";
import { useState } from "react";

export const SearchBar = () => {
  const sigma = useSigma();
  const { gotoNode } = useCamera();
  const [query, setQuery] = useState("");

  const graph = sigma.getGraph();

  // 1. Prepare search index from graph nodes
  const nodes = graph.nodes().map((id) => ({
    id,
    label: graph.getNodeAttribute(id, "label"),
    description: graph.getNodeAttribute(id, "description"),
    // Include any other metadata you want searchable
    link: graph.getNodeAttribute(id, "link") || [],
    tags: graph.getNodeAttribute(id, "tags") || [],
  }));

  const fuse = new Fuse(nodes, {
    // We assign "weight" so a title match ranks higher than a description match
    keys: [
      { name: "label", weight: 2 },
      { name: "description", weight: 1 },
      { name: "link", weight: 1 },
      { name: "tags", weight: 1 },
    ],
    threshold: 0.4, // Keep it loose for the "fuzzy" feel
    ignoreLocation: true, // Search for the term anywhere in the long description
    includeMatches: true, // Useful if you want to highlight the snippet later
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getSnippet = (result: any) => {
    // 1. Check if the match happened in the description
    const descMatch = result.matches?.find((m: any) => m.key === "description");

    if (descMatch && descMatch.value) {
      // Return the first 60 characters of the matched text
      return descMatch.value.substring(0, 60).replace(/\n/g, " ") + "...";
    }

    // 2. Fallback: If it matched the label, just show the start of the description anyway
    if (result.item.description) {
      return (
        result.item.description.substring(0, 60).replace(/\n/g, " ") + "..."
      );
    }

    return "No description available.";
  };

  // A helper to safely split and embolden text based on Fuse.js indices
  const HighlightedText = ({
    text,
    indices,
  }: {
    text: string;
    indices: number[][];
  }) => {
    if (!indices || indices.length === 0) return <span>{text}</span>;

    let lastIndex = 0;
    const elements = [];

    indices.forEach(([start, end], i) => {
      // 1. Add normal text BEFORE the match
      if (start > lastIndex) {
        elements.push(
          <span key={`text-${i}`}>{text.slice(lastIndex, start)}</span>,
        );
      }
      // 2. Add the matched text (emboldened and slightly colored)
      elements.push(
        <strong
          key={`match-${i}`}
          style={{ color: "#550000", fontWeight: 700 }}
        >
          {text.slice(start, end + 1)}
        </strong>,
      );
      lastIndex = end + 1;
    });

    // 3. Add any remaining normal text AFTER the last match
    if (lastIndex < text.length) {
      elements.push(<span key="end">{text.slice(lastIndex)}</span>);
    }

    return <>{elements}</>;
  };

  // Inside your SearchBar component:
  const getMatchData = (result: any, key: string) => {
    // Find the match object for either "label" or "description", or "link"
    return result.matches?.find((m: any) => m.key === key) || null;
  };

  const results = fuse.search(query).slice(0, 8);

  const handleSelect = (nodeId: string) => {
    // 1. Pan the camera
    gotoNode(nodeId, { duration: 600 });

    // 2. Visual Highlight (using Sigma's internal state)
    const graph = sigma.getGraph();

    // Temporarily boost the size of the found node
    const originalSize = graph.getNodeAttribute(nodeId, "size");
    graph.setNodeAttribute(nodeId, "size", originalSize * 2);
    graph.setNodeAttribute(nodeId, "highlighted", true);

    // Shrink it back after a second
    setTimeout(() => {
      graph.setNodeAttribute(nodeId, "size", originalSize);
      graph.setNodeAttribute(nodeId, "highlighted", false);
    }, 1500);

    setQuery("");
  };
  return (
    <div
      className="search-overlay"
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        zIndex: 10,
        width: "300px", // <-- 1. Lock the width here
      }}
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search nodes or contents..."
        className="text-black"
        style={{
          padding: "10px",
          width: "100%", // <-- 2. Fill the locked container
          boxSizing: "border-box", // Prevents padding from breaking the width
          borderRadius: "6px",
          border: "1px solid #ddd",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      />
      {query && (
        <ul
          style={{
            background: "white",
            listStyle: "none",
            padding: 0,
            margin: "5px 0 0 0",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
        >
          {results.map((r) => {
            const labelMatch = getMatchData(r, "label");
            const descMatch = getMatchData(r, "description");
            const linkMatch = getMatchData(r, "link"); // Extract link match

            return (
              <li
                key={r.item.id}
                onClick={() => handleSelect(r.item.id)}
                style={{
                  padding: "10px 15px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f5f5f5")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "white")
                }
              >
                {/* 1. The Node Name */}
                <div
                  style={{ fontWeight: "600", color: "#333", fontSize: "14px" }}
                >
                  <HighlightedText
                    text={r.item.label}
                    indices={labelMatch ? labelMatch.indices : []}
                  />
                </div>

                {/* 2. The Link Preview (Google-style URL placement) */}
                {r.item.link && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#006621", // A classic "search result link" green
                      marginTop: "2px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <HighlightedText
                      text={r.item.link}
                      indices={linkMatch ? linkMatch.indices : []}
                    />
                  </div>
                )}

                {/* 3. The Context Snippet */}
                <div
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    marginTop: "4px",
                    lineHeight: "1.4",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                  }}
                >
                  <HighlightedText
                    text={
                      r.item.description?.replace(/\n/g, " ") ||
                      "No description."
                    }
                    indices={descMatch ? descMatch.indices : []}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
