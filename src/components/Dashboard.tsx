import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Shield,
  ShieldOff,
  Upload,
  List,
  Power,
  Trash2,
  LogOut,
  Plus,
  X,
} from "lucide-react";
import { useAppStore } from "../store/app";
import "../styles/Dashboard.css";

interface Server {
  code: string;
  name: string;
  ip: string;
  udp_port: number;
  tcp_port: number;
}

interface VpnConfig {
  name: string;
  server: string;
  protocol: string;
  created_at: string;
}

interface VpnConnection {
  config_name: string;
  server: string;
  connected_at: string;
  bytes_sent: number;
  bytes_received: number;
}

export default function Dashboard() {
  const { user, clearAuth } = useAppStore();
  const [view, setView] = useState<"status" | "list">("status");
  const [showGenerate, setShowGenerate] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberCreds, setRememberCreds] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installProgress, setInstallProgress] = useState("");

  const [generateForm, setGenerateForm] = useState({
    username: "",
    password: "",
    email: "",
    server: "sg",
    protocol: "udp" as "udp" | "tcp",
    expiryDays: 365,
  });

  useEffect(() => {
    const loadSavedCreds = async () => {
      if (selectedConfig) {
        try {
          const saved = await invoke<string>("load_credentials", {
            configName: selectedConfig,
          });
          if (saved) {
            const [u, p] = saved.split("\n");
            setUsername(u);
            setPassword(p);
            setRememberCreds(true);
          }
        } catch {}
      }
    };
    if (selectedConfig) loadSavedCreds();
  }, [selectedConfig]);

  useEffect(() => {
    const unlisten = listen("install-progress", (event: any) => {
      setInstallProgress(event.payload);
      if (event.payload === "Complete!") {
        setTimeout(() => {
          setShowInstallModal(false);
          setInstallProgress("");
        }, 500);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery<VpnConfig[]>({
    queryKey: ["configs"],
    queryFn: () => invoke("list_configs"),
  });

  const { data: servers = [] } = useQuery<Server[]>({
    queryKey: ["servers"],
    queryFn: () => invoke("list_servers"),
  });

  const { data: vpnStatus } = useQuery<VpnConnection | null>({
    queryKey: ["vpn-status"],
    queryFn: () => invoke("get_vpn_status"),
    refetchInterval: 3000,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      try {
        await invoke("check_openvpn");
      } catch (e) {
        setShowInstallModal(true);
        await invoke("install_openvpn", { window: getCurrentWindow() });
      }

      if (rememberCreds) {
        const creds = `${username}\n${password}`;
        await invoke("save_credentials", {
          configName: selectedConfig,
          credentials: creds,
        });
      }
      return invoke("connect_vpn", { configName: selectedConfig });
    },
    onSuccess: () => {
      setShowCredentials(false);
      setUsername("");
      setPassword("");
    },
    onError: (error: any) => alert(`Failed: ${error}`),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => invoke("disconnect_vpn"),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["vpn-status"] }),
    onError: (error: any) => alert(`Failed: ${error}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (configName: string) =>
      invoke("delete_config", { name: configName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      setDeleteConfirm(null);
    },
    onError: (error: any) => alert(`Failed: ${error}`),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return invoke("generate_config", {
        username: generateForm.username,
        password: generateForm.password,
        email: generateForm.email || null,
        serverCode: generateForm.server,
        protocol: generateForm.protocol,
        expiryDays: generateForm.expiryDays,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      setShowGenerate(false);
      setGenerateForm({
        username: "",
        password: "",
        email: "",
        server: "sg",
        protocol: "udp",
        expiryDays: 365,
      });
      alert("Config generated!");
    },
    onError: (error: any) => {
      console.error(error);
      alert(`Failed: ${error}`);
    },
  });

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ovpn";
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const content = await file.text();
        const name = file.name.replace(".ovpn", "");
        try {
          await invoke("import_config", { name, content });
          queryClient.invalidateQueries({ queryKey: ["configs"] });
          alert("Imported!");
        } catch (error: any) {
          alert(`Import failed: ${error}`);
        }
      }
    };
    input.click();
  };

  const handleConnect = (configName: string) => {
    setSelectedConfig(configName);
    setShowCredentials(true);
  };

  const handleLogout = () => {
    clearAuth();
    window.location.reload();
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <Shield className="logo-icon" size={24} />
          <span className="logo-text">RBW VPN</span>
        </div>
        <div className="header-right">
          <span className="username">{user?.username}</span>
          <button onClick={handleLogout} className="btn-icon">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Status Card */}
      <div className={`status-card ${vpnStatus ? "connected" : ""}`}>
        {vpnStatus ? (
          <>
            <ShieldOff className="status-icon" size={48} />
            <div className="status-text">Connected</div>
            <div className="status-detail">{vpnStatus.config_name}</div>
            <button
              onClick={() => disconnectMutation.mutate()}
              className="btn-disconnect"
            >
              <Power size={16} />
              Disconnect
            </button>
          </>
        ) : (
          <>
            <Shield className="status-icon" size={48} />
            <div className="status-text">Not Connected</div>
            <div className="status-detail">Select a config to connect</div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${view === "status" ? "active" : ""}`}
          onClick={() => setView("status")}
        >
          <Shield size={16} />
          Status
        </button>
        <button
          className={`tab ${view === "list" ? "active" : ""}`}
          onClick={() => setView("list")}
        >
          <List size={16} />
          Configs
        </button>
      </div>

      {/* Content */}
      <div className="content">
        {view === "status" && (
          <div className="status-view">
            {vpnStatus ? (
              <div className="stats">
                <div className="stat-item">
                  <label>Sent</label>
                  <span>
                    {(vpnStatus.bytes_sent / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="stat-item">
                  <label>Received</label>
                  <span>
                    {(vpnStatus.bytes_received / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No active connection</p>
                <p className="hint">Go to Configs tab to connect</p>
              </div>
            )}
          </div>
        )}

        {view === "list" && (
          <div className="config-view">
            {/* Action Buttons */}
            <div className="action-buttons">
              <button onClick={handleImport} className="btn-action primary">
                <Upload size={18} />
                Import .ovpn
              </button>
              <button
                onClick={() => setShowGenerate(true)}
                className="btn-action secondary"
              >
                <Plus size={18} />
                Generate
              </button>
            </div>

            {/* Config List */}
            {configs.length === 0 ? (
              <div className="empty-state">
                <p>No configurations</p>
                <p className="hint">Import or generate one to get started</p>
              </div>
            ) : (
              <div className="config-list">
                {configs.map((config) => (
                  <div key={config.name} className="config-item">
                    <div className="config-info">
                      <div className="config-name">{config.name}</div>
                      <div className="config-meta">
                        {config.server} • {config.protocol.toUpperCase()}
                      </div>
                    </div>
                    <div className="config-actions">
                      <button
                        onClick={() => handleConnect(config.name)}
                        className="btn-connect"
                        disabled={!!vpnStatus}
                      >
                        <Power size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(config.name);
                        }}
                        className="btn-delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Credentials Modal */}
      {showCredentials && (
        <div
          className="modal-overlay"
          onClick={() => setShowCredentials(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Enter Credentials</h3>
              <button
                onClick={() => setShowCredentials(false)}
                className="btn-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberCreds}
                    onChange={(e) => setRememberCreds(e.target.checked)}
                  />
                  <span>Remember credentials</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowCredentials(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => connectMutation.mutate()}
                className="btn-confirm"
                disabled={!username || !password}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Configuration</h3>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete <strong>{deleteConfirm}</strong>
                ?
              </p>
              <p className="warning">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="btn-confirm danger"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerate && (
        <div className="modal-overlay" onClick={() => setShowGenerate(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate Configuration</h3>
              <button
                onClick={() => setShowGenerate(false)}
                className="btn-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={generateForm.username}
                  onChange={(e) =>
                    setGenerateForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={generateForm.password}
                  onChange={(e) =>
                    setGenerateForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Enter password"
                />
              </div>
              <div className="form-group">
                <label>Email (Optional)</label>
                <input
                  type="email"
                  value={generateForm.email}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, email: e.target.value })
                  }
                  placeholder="your@email.com"
                />
              </div>
              <div className="form-group">
                <label>Server</label>
                <select
                  value={generateForm.server}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, server: e.target.value })
                  }
                >
                  {servers.map((server) => (
                    <option key={server.code} value={server.code}>
                      {server.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Expiry Days</label>
                <input
                  type="number"
                  value={generateForm.expiryDays}
                  onChange={(e) =>
                    setGenerateForm({
                      ...generateForm,
                      expiryDays: parseInt(e.target.value) || 365,
                    })
                  }
                  min="1"
                  max="3650"
                />
              </div>
              <div className="form-group">
                <label>Protocol</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      checked={generateForm.protocol === "udp"}
                      onChange={() =>
                        setGenerateForm({ ...generateForm, protocol: "udp" })
                      }
                    />
                    UDP
                  </label>
                  <label>
                    <input
                      type="radio"
                      checked={generateForm.protocol === "tcp"}
                      onChange={() =>
                        setGenerateForm({ ...generateForm, protocol: "tcp" })
                      }
                    />
                    TCP
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowGenerate(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => generateMutation.mutate()}
                className="btn-confirm"
                disabled={!generateForm.username || !generateForm.password}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
      {showInstallModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Installing OpenVPN</h3>
            </div>
            <div className="modal-body">
              <p>{installProgress || "Preparing installation..."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
