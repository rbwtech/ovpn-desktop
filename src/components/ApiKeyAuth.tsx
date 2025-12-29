import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useAppStore } from "../store/app";
import { api, VerifyResponse } from "../lib/api";
import { Shield, ExternalLink, Key, Eye, EyeOff } from "lucide-react";
import "../styles/ApiKeyAuth.css";

export default function ApiKeyAuth() {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [showApiKey, setShowApiKey] = useState(false); // ← ADD THIS
  const { setApiKey: saveApiKey, setUser } = useAppStore();

  const verifyMutation = useMutation({
    mutationFn: () => api.verifyApiKey(apiKey),
    onSuccess: (data: VerifyResponse) => {
      saveApiKey(apiKey);
      setUser({
        username: data.username,
        serverLocation: data.server_location,
      });
    },
    onError: () => {
      setError("Invalid API Key. Please check and try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!apiKey.trim()) {
      setError("Please enter an API Key");
      return;
    }
    verifyMutation.mutate();
  };

  const openWebsite = () => {
    openUrl("https://ovpn.rbwtech.io");
  };

  return (
    <div className="auth-container">
      <div className="background-glow" />

      <div className="auth-card glass-panel emerald-border">
        <div className="auth-header">
          <Shield size={48} className="accent" />
          <h1>
            RBW-TECH <span className="accent">OVPN</span>
          </h1>
          <p className="subtitle">Desktop VPN Client</p>
        </div>

        <div className="info-box">
          <Key size={18} />
          <div>
            <p>Need an API Key?</p>
            <button onClick={openWebsite} className="link-btn">
              Visit ovpn.rbwtech.io <ExternalLink size={14} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>API Key</label>
            <div className="input-with-icon">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="input-field"
                disabled={verifyMutation.isPending}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="eye-toggle"
                disabled={verifyMutation.isPending}
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={verifyMutation.isPending}
          >
            {verifyMutation.isPending ? "Verifying..." : "Connect"}
          </button>
        </form>
      </div>
    </div>
  );
}
