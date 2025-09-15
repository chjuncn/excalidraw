import { Footer } from "@excalidraw/excalidraw/index";
import React from "react";

import { alertTriangleIcon } from "@excalidraw/excalidraw/components/icons";

import { isExcalidrawPlusSignedUser } from "../app_constants";

import { DebugFooter, isVisualDebuggerEnabled } from "./DebugCanvas";
import { EncryptedIcon } from "./EncryptedIcon";
import { ExcalidrawPlusAppLink } from "./ExcalidrawPlusAppLink";

export const AppFooter = React.memo(
  ({ onChange }: { onChange: () => void }) => {
    return (
      <Footer>
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
          }}
        >
          {isVisualDebuggerEnabled() && <DebugFooter onChange={onChange} />}
          {isExcalidrawPlusSignedUser ? (
            <ExcalidrawPlusAppLink />
          ) : (
            <EncryptedIcon />
          )}
          <button
            type="button"
            title="Check text consistency"
            aria-label="Check text consistency"
            className="help-icon"
            onClick={() => {
              const event = new CustomEvent("excalidraw:check-consistency");
              window.dispatchEvent(event);
            }}
            style={{ marginLeft: 8 }}
          >
            {alertTriangleIcon}
          </button>
        </div>
      </Footer>
    );
  },
);
