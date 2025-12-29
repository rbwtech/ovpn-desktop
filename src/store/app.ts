import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface User {
  username: string;
  serverLocation: string;
}

interface VpnStatus {
  isConnected: boolean;
  configName?: string;
  server?: string;
  connectedAt?: string;
}

interface AppStore {
  apiKey: string | null;
  user: User | null;
  vpnStatus: VpnStatus;
  setApiKey: (key: string) => Promise<void>;
  setUser: (user: User) => void;
  setVpnStatus: (status: VpnStatus) => void;
  clearAuth: () => Promise<void>;
  loadApiKey: () => Promise<string | null>;
}

export const useAppStore = create<AppStore>((set) => ({
  apiKey: null,
  user: null,
  vpnStatus: { isConnected: false },

  setApiKey: async (key) => {
    localStorage.setItem("rbw_api_key", key);
    try {
      await invoke("save_api_key_to_disk", { apiKey: key });
    } catch (e) {
      console.error("Failed to save API key to disk:", e);
    }
    set({ apiKey: key });
  },

  loadApiKey: async () => {
    try {
      const diskKey = await invoke<string>("load_api_key_from_disk");
      if (diskKey) {
        set({ apiKey: diskKey });
        localStorage.setItem("rbw_api_key", diskKey);
        return diskKey;
      }
    } catch {
      const localKey = localStorage.getItem("rbw_api_key");
      if (localKey) {
        set({ apiKey: localKey });
        return localKey;
      }
    }
    return null;
  },

  setUser: (user) => set({ user }),

  setVpnStatus: (status) => set({ vpnStatus: status }),

  clearAuth: async () => {
    localStorage.removeItem("rbw_api_key");
    try {
      await invoke("delete_api_key_from_disk");
    } catch (e) {
      console.error("Failed to delete API key from disk:", e);
    }
    set({ apiKey: null, user: null });
  },
}));
