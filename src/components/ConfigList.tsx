import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Trash2, Power, PowerOff, Server } from "lucide-react";
import "../styles/ConfigList.css";

export default function ConfigList() {
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ["configs"],
    queryFn: api.listConfigs,
  });

  const { data: vpnStatus } = useQuery({
    queryKey: ["vpn-status"],
    queryFn: api.getVpnStatus,
    refetchInterval: 3000,
  });

  const connectMutation = useMutation({
    mutationFn: (configName: string) => api.connectVpn(configName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vpn-status"] });
    },
    onError: (error: Error) => {
      alert(`Connection failed: ${error.message}`);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: api.disconnectVpn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vpn-status"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => api.deleteConfig(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
    },
  });

  const handleConnect = (configName: string) => {
    if (vpnStatus) {
      alert("Please disconnect current VPN first");
      return;
    }
    connectMutation.mutate(configName);
  };

  const handleDelete = (name: string) => {
    if (confirm(`Delete configuration "${name}"?`)) {
      deleteMutation.mutate(name);
    }
  };

  if (isLoading) {
    return (
      <div className="configs-loading">
        <div className="spinner" />
        <p>Loading configurations...</p>
      </div>
    );
  }

  if (!configs || configs.length === 0) {
    return (
      <div className="configs-empty glass-panel">
        <Server size={48} className="empty-icon" />
        <p>No VPN configurations yet</p>
        <span className="empty-hint">
          Generate your first config to get started
        </span>
      </div>
    );
  }

  return (
    <div className="config-list">
      {configs.map((config) => {
        const isActive = vpnStatus?.config_name === config.name;

        return (
          <div
            key={config.name}
            className={`config-item glass-panel ${isActive ? "active" : ""}`}
          >
            <div className="config-info">
              <h4>{config.name}</h4>
              <div className="config-meta">
                <span>{config.server}</span>
                <span className="separator">•</span>
                <span>{config.protocol.toUpperCase()}</span>
              </div>
            </div>

            <div className="config-actions">
              {isActive ? (
                <button
                  onClick={() => disconnectMutation.mutate()}
                  className="btn-action disconnect"
                  disabled={disconnectMutation.isPending}
                >
                  <PowerOff size={18} />
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(config.name)}
                  className="btn-action connect"
                  disabled={connectMutation.isPending}
                >
                  <Power size={18} />
                  Connect
                </button>
              )}

              <button
                onClick={() => handleDelete(config.name)}
                className="btn-action delete"
                disabled={isActive || deleteMutation.isPending}
                title="Delete configuration"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
