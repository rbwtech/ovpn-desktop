import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAppStore } from "./store/app";
import { api, VerifyResponse } from "./lib/api";
import ApiKeyAuth from "./components/ApiKeyAuth";
import Dashboard from "./components/Dashboard";

export default function App() {
  const { apiKey, setUser } = useAppStore();

  const verifyMutation = useMutation({
    mutationFn: (key: string) => api.verifyApiKey(key),
    onSuccess: (data: VerifyResponse) => {
      setUser({
        username: data.username,
        serverLocation: data.server_location,
      });
    },
    onError: () => {
      useAppStore.getState().clearAuth();
    },
  });

  useEffect(() => {
    if (apiKey) {
      verifyMutation.mutate(apiKey);
    }
  }, []);

  if (!apiKey || !useAppStore.getState().user) {
    return <ApiKeyAuth />;
  }

  return <Dashboard />;
}
