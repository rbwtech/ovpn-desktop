import { useQuery } from "@tanstack/react-query";
import { api, VpnConnection } from "../lib/api";
import { Shield, ShieldOff, Activity } from "lucide-react";
import "../styles/VpnStatus.css";

export default function VpnStatus() {
  const { data: status } = useQuery({
    queryKey: ["vpn-status"],
    queryFn: api.getVpnStatus,
    refetchInterval: 3000,
  });

  const isConnected = !!status;

  return (
    <div className={`vpn-status glass-panel ${isConnected ? "connected" : ""}`}>
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
  );
}
