import { create } from "zustand";

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
  setApiKey: (key: string) => void;
  setUser: (user: User) => void;
  setVpnStatus: (status: VpnStatus) => void;
  clearAuth: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  apiKey: localStorage.getItem("rbw_api_key"),
  user: null,
  vpnStatus: { isConnected: false },

  setApiKey: (key) => {
    localStorage.setItem("rbw_api_key", key);
    set({ apiKey: key });
  },

  setUser: (user) => set({ user }),

  setVpnStatus: (status) => set({ vpnStatus: status }),

  clearAuth: () => {
    localStorage.removeItem("rbw_api_key");
    set({ apiKey: null, user: null });
  },
}));
