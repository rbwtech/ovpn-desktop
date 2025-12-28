import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
  Activity,
  FileText,
  TrendingUp,
  TrendingDown,
  Globe,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "../styles/VpnStatus.css";

interface VpnConnection {
  config_name: string;
  server: string;
  server_ip: string;
  server_port: number;
  protocol: string;
  private_ipv4: string;
  private_ipv6: string;
  connected_at: string;
  bytes_sent: number;
  bytes_received: number;
  speed_up: number;
  speed_down: number;
}

export default function VpnStatus() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [speedHistory, setSpeedHistory] = useState<{
    up: number[];
    down: number[];
  }>({
    up: [],
    down: [],
  });

  const { data: status } = useQuery<VpnConnection | null>({
    queryKey: ["vpn-status"],
    queryFn: async () => {
      const result = await invoke<VpnConnection | null>("get_vpn_status");
      console.log("VPN Status:", result);
      return result;
    },
    refetchInterval: 1000,
  });

  const { data: logs } = useQuery({
    queryKey: ["vpn-logs"],
    queryFn: async () => {
      const result = await invoke<string>("get_vpn_logs");
      return result;
    },
    refetchInterval: 2000,
    enabled: true,
  });

  useEffect(() => {
    if (status) {
      setSpeedHistory((prev) => {
        const newUp = [...prev.up, status.speed_up].slice(-60);
        const newDown = [...prev.down, status.speed_down].slice(-60);
        return { up: newUp, down: newDown };
      });
    }
  }, [status]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const upData = speedHistory.up.length > 0 ? speedHistory.up : [0];
    const downData = speedHistory.down.length > 0 ? speedHistory.down : [0];
    const maxSpeed = Math.max(...upData, ...downData, 10000);

    // Clear
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw lines
    if (downData.length > 1) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.beginPath();
      downData.forEach((speed, i) => {
        const x = (width / downData.length) * i;
        const y = height - (speed / maxSpeed) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    if (upData.length > 1) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      upData.forEach((speed, i) => {
        const x = (width / upData.length) * i;
        const y = height - (speed / maxSpeed) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Max speed label
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "10px monospace";
    ctx.fillText(`${(maxSpeed / 1024).toFixed(1)} KB/s`, width - 60, 12);
  }, [speedHistory]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatSpeed = (bytesPerSec: number) => {
    return `${(bytesPerSec / 1024).toFixed(2)} KB/s`;
  };

  const isConnected = !!status;

  if (!isConnected) {
    return (
      <div className="empty-state">
        <p>No active connection</p>
        <p className="hint">Go to Configs tab to connect</p>
      </div>
    );
  }

  return (
    <div className="vpn-status-container">
      {/* Traffic Chart */}
      <div className="traffic-chart glass-panel">
        <div className="chart-header">
          <Activity size={18} />
          <h3>Network Traffic</h3>
          <span className="max-speed">
            {formatSpeed(
              Math.max(status.speed_up || 0, status.speed_down || 0)
            )}
          </span>
        </div>
        <canvas ref={canvasRef} width={400} height={150} />
        <div className="chart-legend">
          <div className="legend-item">
            <TrendingDown size={14} className="down-color" />
            <span>{formatSpeed(status.speed_down)}</span>
          </div>
          <div className="legend-item">
            <TrendingUp size={14} className="up-color" />
            <span>{formatSpeed(status.speed_up)}</span>
          </div>
        </div>
      </div>

      {/* Connection Details */}
      <div className="connection-details glass-panel">
        <div className="details-header">
          <Globe size={18} />
          <h3>Connection Details</h3>
        </div>

        <div className="details-grid">
          <div className="detail-section">
            <h4>You:</h4>
            <div className="detail-row">
              <span className="detail-label">Private IP (IPv4)</span>
              <span className="detail-value">
                {status.private_ipv4 || "Loading..."}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Private IP (IPv6)</span>
              <span className="detail-value">
                {status.private_ipv6 || "Not assigned"}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h4>Server:</h4>
            <div className="detail-row">
              <span className="detail-label">Public IP</span>
              <span className="detail-value">{status.server_ip}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Port / Protocol</span>
              <span className="detail-value">
                {status.server_port} / {status.protocol}
              </span>
            </div>
          </div>

          <div className="detail-section">
            <h4>Transfer:</h4>
            <div className="detail-row">
              <span className="detail-label">Sent</span>
              <span className="detail-value">
                {formatBytes(status.bytes_sent)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Received</span>
              <span className="detail-value">
                {formatBytes(status.bytes_received)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Logs */}
      {logs && logs.length > 0 && (
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
