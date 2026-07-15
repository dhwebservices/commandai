import { contextBridge, ipcRenderer } from "electron";

// Expose API to web console for communicating with desktop app
contextBridge.exposeInMainWorld("comandrDesktop", {
  // Called when user logs in through web console
  onLogin: (userId: string, accessToken: string) => {
    ipcRenderer.send("user-logged-in", { userId, accessToken });
  },

  // Called when user logs out through web console
  onLogout: () => {
    ipcRenderer.send("user-logged-out");
  },

  // Check if running in desktop app
  isDesktopApp: () => true,
});
