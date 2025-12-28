import { useState } from "react";
import { useAppStore } from "../store/app";
import { LogOut, Settings, Plus, List } from "lucide-react";
import VpnStatus from "./VpnStatus";
import GenerateConfig from "./GenerateConfig";
import ConfigList from "./ConfigList";
import "../styles/Dashboard.css";

type Tab = "generate" | "configs";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("generate");
  const { user, clearAuth } = useAppStore();

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      clearAuth();
    }
  };

  return (
    <div className="dashboard">
      <div className="background-glow" />

      <header className="dashboard-header">
        <div className="logo">
          <Settings size={24} className="logo-icon" />
          <span>
            RBW-TECH <span className="accent">OVPN</span>
          </span>
        </div>
        <div className="user-info">
          <span>{user?.username}</span>
          <button onClick={handleLogout} className="btn-icon" title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="main-section">
          <VpnStatus />

          <div className="tabs">
            <button
              className={`tab-btn ${activeTab === "generate" ? "active" : ""}`}
              onClick={() => setActiveTab("generate")}
            >
              <Plus size={18} />
              Generate Config
            </button>
            <button
              className={`tab-btn ${activeTab === "configs" ? "active" : ""}`}
              onClick={() => setActiveTab("configs")}
            >
              <List size={18} />
              My Configs
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "generate" ? <GenerateConfig /> : <ConfigList />}
          </div>
        </div>
      </div>
    </div>
  );
}
