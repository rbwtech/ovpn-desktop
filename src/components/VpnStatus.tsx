import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { Shield, ShieldOff, Activity, FileText } from "lucide-react";
import "../styles/VpnStatus.css";

export default function VpnStatus() {
  const { data: status } = useQuery({
    queryKey: ["vpn-status"],
    queryFn: async () => {
      const result = await invoke<any>("get_vpn_status");
      return result;
    },
    refetchInterval: 3000,
  });

  const { data: logs } = useQuery({
    queryKey: ["vpn-logs"],
    queryFn: async () => {
      const result = await invoke<string>("get_vpn_logs");
      return result;
    },
    refetchInterval: 2000,
    enabled: !!status,
  });

  const isConnected = !!status;

  return (
    <div className="vpn-status-container">
      <div
        className={`vpn-status glass-panel ${isConnected ? "connected" : ""}`}
      >
        <div className="status-icon">
          {isConnected ? (
            <Shield size={32} className="accent" />
          ) : (
            <ShieldOff size={32} className="inactive" />
          )}
        </div>

        <div className="status-info">
          <h2>VPN Status</h2>
          {isConnected && status ? (
            <>
              <div className="status-badge">
                <Activity size={14} />
                <span>Connected</span>
              </div>
              <div className="status-details">
                <div className="detail-item">
                  <span className="label">Config:</span>
                  <span className="value">{status.config_name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Server:</span>
                  <span className="value">{status.server}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="status-badge inactive">
              <span>Disconnected</span>
            </div>
          )}
        </div>
      </div>

      {isConnected && logs && (
        <div className="logs-panel glass-panel">
          <div className="logs-header">
            <FileText size={18} />
            <h3>Connection Logs</h3>
          </div>
          <div className="logs-content">
            <pre>{logs}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
