import { ipcMain } from "dubloon-electron-shim/main";
import { useEffect } from "react";

export function useIpcMain() {
  useEffect(() => {
    // Respond to the renderer with the time it took to receive the message on
    // the main process.
    ipcMain.handle("ping", (e, sentAt: number) => Date.now() - sentAt);

    // Log the counter value that the renderer informed us (main) about.
    ipcMain.on("counter-value", (e, value) => {
      console.log("counter-value", value);
    });
  }, []);
}
