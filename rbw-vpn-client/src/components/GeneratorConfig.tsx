import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Download } from "lucide-react";
import "../styles/GenerateConfig.css";

export default function GenerateConfig() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    serverCode: "sg",
    protocol: "udp",
    expiryDays: 365,
  });

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: api.listServers,
  });

  const generateMutation = useMutation({
    mutationFn: () => api.generateConfig(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configs"] });
      alert("VPN configuration generated successfully!");
      setFormData((prev) => ({ ...prev, username: "", password: "" }));
    },
    onError: (error: Error) => {
      alert(`Failed to generate config: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      alert("Please fill in all required fields");
      return;
    }
    generateMutation.mutate();
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="generate-config glass-panel emerald-border">
      <div className="section-header">
        <Download size={20} />
        <h3>Generate VPN Configuration</h3>
      </div>

      <form onSubmit={handleSubmit} className="config-form">
        <div className="form-row">
          <div className="form-group">
            <label>VPN Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleChange("username", e.target.value)}
              placeholder="Your VPN username"
              className="input-field"
              disabled={generateMutation.isPending}
            />
          </div>

          <div className="form-group">
            <label>VPN Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Your VPN password"
              className="input-field"
              disabled={generateMutation.isPending}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Server Location</label>
            <select
              value={formData.serverCode}
              onChange={(e) => handleChange("serverCode", e.target.value)}
              className="input-field"
              disabled={generateMutation.isPending}
            >
              {servers?.map((server) => (
                <option key={server.code} value={server.code}>
                  {server.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Protocol</label>
            <select
              value={formData.protocol}
              onChange={(e) => handleChange("protocol", e.target.value)}
              className="input-field"
              disabled={generateMutation.isPending}
            >
              <option value="udp">UDP (Faster)</option>
              <option value="tcp">TCP (More Stable)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Expiry Days</label>
          <input
            type="number"
            value={formData.expiryDays}
            onChange={(e) =>
              handleChange("expiryDays", parseInt(e.target.value))
            }
            min="1"
            max="3650"
            className="input-field"
            disabled={generateMutation.isPending}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending
            ? "Generating..."
            : "Generate Configuration"}
        </button>
      </form>
    </div>
  );
}
