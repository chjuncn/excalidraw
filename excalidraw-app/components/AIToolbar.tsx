import { useMemo, useState } from "react";
import { sceneCoordsToViewportCoords } from "@excalidraw/common";

import {
  getElementAbsoluteCoords,
  getBoundTextElement,
  isRectangularElement,
  isTextElement,
  newTextElement,
  refreshTextDimensions,
} from "@excalidraw/element";
import type {
  ExcalidrawBindableElement,
  ExcalidrawElement,
  ExcalidrawTextElement,
  ExcalidrawTextContainer,
  ElementsMap,
} from "@excalidraw/element/types";
import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

const CONTAINER_PADDING = 8;

const getToolbarCoords = (
  element: ExcalidrawElement,
  appState: AppState,
  elementsMap: ElementsMap,
) => {
  const [x1, y1] = getElementAbsoluteCoords(element, elementsMap);
  const { x: viewportX, y: viewportY } = sceneCoordsToViewportCoords(
    { sceneX: x1 + element.width, sceneY: y1 },
    appState,
  );
  const x = viewportX - appState.offsetLeft + 10;
  const y = viewportY - appState.offsetTop - 44; // float above a bit
  return { x, y };
};

export const AIToolbar = ({
  excalidrawAPI,
  forceElementId,
  onClose,
}: {
  excalidrawAPI: ExcalidrawImperativeAPI;
  forceElementId?: string | null;
  onClose?: () => void;
}) => {
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appState = excalidrawAPI.getAppState();
  const elementsArray = excalidrawAPI.getSceneElementsIncludingDeleted();
  const elementsMap = useMemo(() => {
    return new Map(
      elementsArray.map((el) => [el.id, el]),
    ) as unknown as ElementsMap;
  }, [elementsArray]);

  const selected = useMemo(() => {
    const idFromEvent = forceElementId || null;
    const ids = Object.keys(appState.selectedElementIds || {});
    const base = (idFromEvent
      ? elementsMap.get(idFromEvent)
      : ids.length === 1
      ? elementsMap.get(ids[0])
      : null) as ExcalidrawElement | null;

    // Return the element if it's either a rectangle or text element
    return base && (
      (isRectangularElement(base) && base.type === "rectangle") ||
      isTextElement(base)
    ) ? base : null;
  }, [forceElementId, appState.selectedElementIds, elementsMap]);

  if (!selected) {
    return null;
  }

  const { x, y } = getToolbarCoords(selected, appState, elementsMap);
  const isTextElement_ = isTextElement(selected);
  const isRectElement = isRectangularElement(selected) && selected.type === "rectangle";
  const DEFAULT_TEXT_WRAP_WIDTH = 280;
  const LENGTH_WRAP_THRESHOLD = 60;

  const onSubmit = async () => {
    if (!prompt.trim()) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let endpoint: string;
      let requestBody: any;

                  if (isTextElement_) {
        // For text elements, use text editing endpoint
        endpoint = `${import.meta.env.VITE_APP_AI_BACKEND}/v1/ai/text/generate`;
        requestBody = {
          prompt,
          currentText: (selected as ExcalidrawTextElement).text || ""
        };
      } else {
        // For rectangle elements, use rect-text generation endpoint
        endpoint = `${import.meta.env.VITE_APP_AI_BACKEND}/v1/ai/rect-text/generate`;
        requestBody = { prompt };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.detail || json?.message || "Request failed");
      }
      const text: string = json.text || "";

      const elements = excalidrawAPI.getSceneElements();

      if (isTextElement_) {
        // Update existing text element
        const mapNow = new Map(
          excalidrawAPI
            .getSceneElementsIncludingDeleted()
            .map((el) => [el.id, el]),
        ) as unknown as ElementsMap;

        const updated = elements.map((el) => {
          if (el.id !== selected.id) return el;

          const current = el as ExcalidrawTextElement;
          const container = current.containerId
            ? (mapNow.get(current.containerId) as ExcalidrawTextContainer | undefined)
            : null;

          const shouldWrapStandalone = !container && text.length >= LENGTH_WRAP_THRESHOLD;

          const base: ExcalidrawTextElement = {
            ...current,
            text,
            originalText: text,
            autoResize: shouldWrapStandalone ? false : current.autoResize,
            width: shouldWrapStandalone ? DEFAULT_TEXT_WRAP_WIDTH : current.width,
          } as ExcalidrawTextElement;

          const dims = refreshTextDimensions(
            base as unknown as ExcalidrawTextElement,
            (container || null),
            mapNow,
            text,
          ) || { text, x: base.x, y: base.y, width: base.width, height: base.height };
          // lock top-left to the original position for standalone text
          const lockTopLeft = !container;
          return {
            ...base,
            ...dims,
            x: lockTopLeft ? current.x : (dims as any).x,
            y: lockTopLeft ? current.y : (dims as any).y,
          } as any;
        });
        excalidrawAPI.updateScene({ elements: updated });
        const updatedEl = updated.find((el) => el.id === selected.id);
        if (updatedEl) {
          // ensure the updated text is visible to the user
          excalidrawAPI.scrollToContent(updatedEl as any, { animate: true });
        }
      } else if (isRectElement) {
        // Handle rectangle with bound text or create new text
        const mapNow = new Map(
          excalidrawAPI
            .getSceneElementsIncludingDeleted()
            .map((el) => [el.id, el]),
        ) as unknown as ElementsMap;
        const bound = getBoundTextElement(
          selected as ExcalidrawBindableElement,
          mapNow,
        ) as ExcalidrawTextElement | null;

        if (bound) {
          const updated = elements.map((el) => {
            if (el.id !== bound.id) return el;
            // bound text wraps to container automatically
            const base = { ...(el as ExcalidrawTextElement), text, originalText: text } as ExcalidrawTextElement;
            const dims = refreshTextDimensions(
              base as unknown as ExcalidrawTextElement,
              (selected as unknown as ExcalidrawTextContainer),
              mapNow,
              text,
            ) || { text, x: base.x, y: base.y, width: base.width, height: base.height };
            // keep top-left aligned with container top-left padding behavior
            return {
              ...base,
              ...dims,
              x: (dims as any).x,
              y: (dims as any).y,
            } as any;
          });
          excalidrawAPI.updateScene({ elements: updated });
          const updatedEl = updated.find((el) => el.id === bound.id);
          if (updatedEl) {
            excalidrawAPI.scrollToContent(updatedEl as any, { animate: true });
          }
        } else {
          let newText = newTextElement({
            text,
            originalText: text,
            // align created text's top-left with selected rectangle's top-left
            x: selected.x,
            y: selected.y,
            strokeColor: appState.currentItemStrokeColor,
            fontSize: 16,
            fontFamily: 1,
            textAlign: "center",
            verticalAlign: "middle",
            frameId: selected.frameId ?? null,
          });
          // For long text, ensure it wraps to a sensible default width.
          // We must assign a valid fractional index and keep element integrity.
          if (text.length >= LENGTH_WRAP_THRESHOLD) {
            // create a wrapped clone, then copy safe fields back
            const provisional = {
              ...(newText as ExcalidrawTextElement),
              autoResize: false,
              width: DEFAULT_TEXT_WRAP_WIDTH,
            } as ExcalidrawTextElement;
            const dims = refreshTextDimensions(
              provisional as unknown as ExcalidrawTextElement,
              null,
              mapNow,
              text,
            ) || { text, x: provisional.x, y: provisional.y, width: provisional.width, height: provisional.height };
            newText = {
              ...(newText as any),
              text: dims.text,
              width: dims.width,
              height: dims.height,
              autoResize: false,
            } as any;
          }
          excalidrawAPI.updateScene({ elements: [...elements, newText] });
          // center viewport on the newly created text
          excalidrawAPI.scrollToContent(newText as any, { animate: true });
        }
      }

      setPrompt("");
      onClose?.();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const placeholderText = isTextElement_
    ? "Ask AI to edit text…"
    : "Ask AI for text…";

  return (
    <div
      className="excalidraw-canvas-buttons"
      style={{
        position: "absolute",
        zIndex: 1000,
        top: `${y}px`,
        left: `${x}px`,
        padding: "6px 8px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "8px",
        background: "var(--island-bg-color)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--border-radius-lg)",
        boxShadow: "var(--shadow-island)",
        minWidth: 420,
        height: 40,
      }}
    >
      <input
        type="text"
        placeholder={placeholderText}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={submitting}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !submitting) {
            onSubmit();
          }
        }}
        style={{
          flex: 1,
          padding: "6px 10px",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--border-radius-md)",
          background: "var(--input-bg)",
          color: "var(--text-color-primary)",
          fontSize: 13,
          outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          onClick={onSubmit}
          disabled={submitting}
          style={{
            padding: "6px 12px",
            borderRadius: "var(--border-radius-md)",
            border: "1px solid var(--color-primary)",
            background: "var(--color-primary)",
            color: "var(--color-primary-contrast)",
            cursor: submitting ? "default" : "pointer",
            fontSize: 13,
            fontWeight: 500,
            minWidth: 50,
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "…" : "Send"}
        </button>
        <button
          onClick={() => onClose?.()}
          style={{
            padding: "6px 8px",
            borderRadius: "var(--border-radius-md)",
            border: "1px solid var(--color-border)",
            background: "var(--button-gray-1)",
            cursor: "pointer",
            color: "var(--text-color-primary)",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 32,
            height: 28,
          }}
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>
      </div>
      {error && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            padding: "6px 8px",
            background: "var(--color-danger-bg)",
            border: "1px solid var(--color-danger)",
            borderRadius: "var(--border-radius-md)",
            color: "var(--color-danger)",
            fontSize: 12,
            boxShadow: "var(--shadow-island)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
