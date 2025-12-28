import { invoke } from "@tauri-apps/api/tauri";

export interface VerifyResponse {
  valid: boolean;
  username: string;
  server_location: string;
}

export interface Server {
  code: string;
  name: string;
  ip: string;
  udp_port: number;
  tcp_port: number;
}

export interface VpnConfig {
  name: string;
  server: string;
  protocol: string;
  created_at: string;
}

export interface VpnConnection {
  config_name: string;
  server: string;
  connected_at: string;
  bytes_sent: number;
  bytes_received: number;
}

export const api = {
  verifyApiKey: (apiKey: string): Promise<VerifyResponse> =>
    invoke("verify_api_key", { apiKey }),

  listServers: (): Promise<Server[]> => invoke("list_servers"),

  generateConfig: (params: {
    username: string;
    password: string;
    serverCode: string;
    protocol: string;
    expiryDays?: number;
  }): Promise<VpnConfig> => invoke("generate_config", params),

  importConfig: (name: string, content: string): Promise<VpnConfig> =>
    invoke("import_config", { name, content }),

  listConfigs: (): Promise<VpnConfig[]> => invoke("list_configs"),

  deleteConfig: (name: string): Promise<void> =>
    invoke("delete_config", { name }),

  connectVpn: (configName: string): Promise<void> =>
    invoke("connect_vpn", { configName }),

  disconnectVpn: (): Promise<void> => invoke("disconnect_vpn"),

  getVpnStatus: (): Promise<VpnConnection | null> => invoke("get_vpn_status"),
};
