import { useMemo, useState } from "react";
import { sceneCoordsToViewportCoords } from "@excalidraw/common";
import { getElementAbsoluteCoords } from "@excalidraw/element";

import type { ElementsMap } from "@excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export const ConflictOverlay = ({
  excalidrawAPI,
  conflicts,
  onClear,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
  conflicts: { aId: string; bId: string; reason: string }[];
  onClear: () => void;
}) => {
  const appState = excalidrawAPI.getAppState();
  const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
  const elementsMap = useMemo(() => {
    return new Map(elements.map((e) => [e.id, e])) as unknown as ElementsMap;
  }, [elements]);

  // Compute viewport overlays for each unique id
  const [openId, setOpenId] = useState<string | null>(null);
  const reasonsById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of conflicts) {
      if (!map.has(c.aId)) {
        map.set(c.aId, []);
      }
      if (!map.has(c.bId)) {
        map.set(c.bId, []);
      }
      map.get(c.aId)!.push(c.reason);
      map.get(c.bId)!.push(c.reason);
    }
    return map;
  }, [conflicts]);

  const ids = Array.from(reasonsById.keys());
  const [activeIdx, setActiveIdx] = useState(0);

  const jumpTo = (id: string) => {
    const el = (elementsMap as any).get(id);
    if (el) {
      excalidrawAPI.scrollToContent(el as any, { animate: true });
    }
  };

  const clearAll = () => {
    const elements = excalidrawAPI.getSceneElementsIncludingDeleted();
    let changed = false;
    const restored = elements.map((el) => {
      const cd = (el as any).customData || {};
      if (cd.__inconsistencyMarked) {
        changed = true;
        const nextCd = { ...cd };
        delete nextCd.__inconsistencyMarked;
        const original = cd.__originalStrokeColor;
        delete nextCd.__originalStrokeColor;
        return {
          ...el,
          strokeColor: original || el.strokeColor,
          customData: nextCd,
        } as any;
      }
      return el as any;
    });
    if (changed) {
      excalidrawAPI.updateScene({ elements: restored });
    }
    onClear();
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      {ids.map((id) => {
        const el = (elementsMap as any).get(id);
        if (!el) {
          return null;
        }
        const [x1, y1, x2, y2] = getElementAbsoluteCoords(el, elementsMap);
        const topLeft = sceneCoordsToViewportCoords(
          { sceneX: x1, sceneY: y1 },
          appState,
        );
        const bottomRight = sceneCoordsToViewportCoords(
          { sceneX: x2, sceneY: y2 },
          appState,
        );
        const left = topLeft.x - appState.offsetLeft;
        const top = topLeft.y - appState.offsetTop;
        const width = bottomRight.x - topLeft.x;
        const height = bottomRight.y - topLeft.y;
        const reasons = reasonsById.get(id) || [];

        return (
          <div
            key={id}
            style={{ position: "absolute", left, top, width, height }}
          >
            {/* Border highlight (pointer-events none) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: "2px solid #ff3b30",
                borderRadius: 6,
                pointerEvents: "none",
              }}
            />
            {/* Info badge */}
            <button
              type="button"
              onClick={() => setOpenId(openId === id ? null : id)}
              style={{
                position: "absolute",
                right: -6,
                top: -10,
                zIndex: 2,
                pointerEvents: "auto",
                background: "#ff3b30",
                color: "white",
                border: "none",
                borderRadius: 20,
                width: 20,
                height: 20,
                fontSize: 12,
                cursor: "pointer",
              }}
              title="Show inconsistency reason"
              aria-label="Show inconsistency reason"
            >
              !
            </button>
            {openId === id && (
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  right: 20,
                  minWidth: 220,
                  maxWidth: 320,
                  background: "var(--island-bg-color)",
                  color: "var(--text-color-primary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  boxShadow: "var(--shadow-island)",
                  padding: "8px 10px",
                  pointerEvents: "auto",
                }}
                role="dialog"
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  Inconsistency
                </div>
                {reasons.map((r, idx) => (
                  <div key={idx} style={{ fontSize: 12, marginBottom: 4 }}>
                    {r}
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => jumpTo(id)}
                    style={{
                      background: "var(--color-primary)",
                      color: "var(--color-primary-contrast)",
                      border: "1px solid var(--color-primary)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Jump to
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenId(null)}
                    style={{
                      background: "var(--button-gray-1)",
                      color: "var(--text-color-primary)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {ids.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            background: "var(--island-bg-color)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            boxShadow: "var(--shadow-island)",
            padding: "6px 10px",
            fontSize: 12,
            color: "var(--text-color-primary)",
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>
            {ids.length} conflicted item{ids.length > 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => {
                const next = (activeIdx - 1 + ids.length) % ids.length;
                setActiveIdx(next);
                jumpTo(ids[next]);
              }}
              style={{
                background: "var(--button-gray-1)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                padding: "4px 6px",
                cursor: "pointer",
                color: "var(--text-color-primary)",
              }}
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => {
                const next = (activeIdx + 1) % ids.length;
                setActiveIdx(next);
                jumpTo(ids[next]);
              }}
              style={{
                background: "var(--button-gray-1)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                padding: "4px 6px",
                cursor: "pointer",
                color: "var(--text-color-primary)",
              }}
            >
              Next
            </button>
            <button
              type="button"
              onClick={() =>
                excalidrawAPI.toggleSidebar({ name: "conflicts", force: true })
              }
              style={{
                background: "var(--color-primary)",
                color: "var(--color-primary-contrast)",
                border: "1px solid var(--color-primary)",
                borderRadius: 6,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              Open list
            </button>
          </div>
          <button
            type="button"
            onClick={clearAll}
            style={{
              marginLeft: 10,
              background: "var(--button-gray-1)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              color: "var(--text-color-primary)",
            }}
          >
            Clear markers
          </button>
        </div>
      )}
    </div>
  );
};

export default ConflictOverlay;
