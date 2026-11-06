import { useEffect, useState } from "react";
import { getErrorMessage, httpClient } from "../../lib/http";

export function useProviderStatus() {
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const [dashRes, profRes] = await Promise.all([
        httpClient.get("/provider/dashboard"),
        httpClient.get("/provider/profile"),
      ]);
      setDashboard(dashRes.data.dashboard);
      setProfile(profRes.data.provider);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const providerStatus = dashboard?.providerStatus || profile?.providerStatus || "invited";

  return {
    providerStatus,
    dashboard,
    profile,
    loading,
    error,
    refresh: fetchStatus,
  };
}
