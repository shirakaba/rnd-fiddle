import { ipcRenderer } from "dubloon-electron-shim/renderer";
import { useEffect } from "react";

export function useIpcRenderer() {
  useEffect(() => {
    // Log the time to round-trip a message from the renderer to main and back.
    ipcRenderer.invoke("ping", Date.now()).then((time) => {
      console.log(`pong: ${time} milliseconds`);
    });

    // Inform main of the latest counter value from the renderer.
    ipcRenderer.send("counter-value", 1);
  }, []);
}
