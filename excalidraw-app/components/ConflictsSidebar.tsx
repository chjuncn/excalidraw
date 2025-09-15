import { useMemo } from "react";
import { Sidebar } from "@excalidraw/excalidraw/components/Sidebar/Sidebar";
import { useUIAppState } from "@excalidraw/excalidraw/context/ui-appState";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export const ConflictsSidebar = ({
  excalidrawAPI,
  conflicts,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
  conflicts: { aId: string; bId: string; reason: string }[];
}) => {
  const appState = useUIAppState();
  const items = useMemo(() => conflicts, [conflicts]);

  if (!appState.openSidebar || appState.openSidebar.name !== "conflicts") {
    return null;
  }

  return (
    <Sidebar name="conflicts" className="conflicts-sidebar">
      <Sidebar.Header>Conflicts</Sidebar.Header>
      <div
        style={{
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {items.length === 0 && (
          <div style={{ fontSize: 12 }}>No conflicts.</div>
        )}
        {items.map((c, idx) => (
          <div
            key={idx}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              background: "var(--island-bg-color)",
            }}
          >
            <div style={{ fontSize: 12 }}>{c.reason}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                onClick={() =>
                  excalidrawAPI.scrollToContent({ id: c.aId } as any, {
                    animate: true,
                  })
                }
                style={{
                  background: "var(--button-gray-1)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Jump A
              </button>
              <button
                type="button"
                onClick={() =>
                  excalidrawAPI.scrollToContent({ id: c.bId } as any, {
                    animate: true,
                  })
                }
                style={{
                  background: "var(--button-gray-1)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Jump B
              </button>
            </div>
          </div>
        ))}
      </div>
    </Sidebar>
  );
};

export default ConflictsSidebar;
