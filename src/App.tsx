import { useEffect, useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAppStore } from "./store/app";
import { api, VerifyResponse } from "./lib/api";
import ApiKeyAuth from "./components/ApiKeyAuth";
import Dashboard from "./components/Dashboard";

export default function App() {
  const { apiKey, setUser, loadApiKey } = useAppStore();
  const [isVerifying, setIsVerifying] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const hasVerified = useRef(false);

  const verifyMutation = useMutation({
    mutationFn: (key: string) => api.verifyApiKey(key),
    onSuccess: (data: VerifyResponse) => {
      setUser({
        username: data.username,
        serverLocation: data.server_location,
      });
      setIsVerifying(false);
      setRetryCount(0);
    },
    onError: (error: any) => {
      console.error("Verify failed:", error);

      const errorMessage = error?.toString() || "";
      const isNetworkError =
        errorMessage.includes("timeout") ||
        errorMessage.includes("network") ||
        errorMessage.includes("fetch");

      if (isNetworkError && retryCount < 2) {
        console.log(`Retrying... (${retryCount + 1}/2)`);
        setRetryCount((prev) => prev + 1);
        setTimeout(() => {
          if (apiKey) verifyMutation.mutate(apiKey);
        }, 2000);
      } else {
        useAppStore.getState().clearAuth();
        setIsVerifying(false);
      }
    },
  });

  useEffect(() => {
    const initAuth = async () => {
      if (hasVerified.current) return;
      hasVerified.current = true;

      const savedKey = await loadApiKey();

      if (savedKey) {
        verifyMutation.mutate(savedKey);
      } else {
        setIsVerifying(false);
      }
    };

    initAuth();
  }, []);

  if (isVerifying) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="spinner" />
          <p style={{ color: "var(--text-muted)", marginTop: "10px" }}>
            {retryCount > 0
              ? `Retrying connection... (${retryCount}/2)`
              : "Verifying credentials..."}
          </p>
        </div>
      </div>
    );
  }

  if (!apiKey || !useAppStore.getState().user) {
    return <ApiKeyAuth />;
  }

  return <Dashboard />;
}
