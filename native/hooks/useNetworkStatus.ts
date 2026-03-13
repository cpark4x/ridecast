import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export interface NetworkStatus {
  isConnected: boolean | null;
  isLoading: boolean;
}

/**
 * Wraps @react-native-community/netinfo and exposes a simple
 * { isConnected, isLoading } object. isConnected is null until the
 * first fetch resolves (isLoading will be true in that window).
 */
export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading]     = useState(true);

  useEffect(() => {
    // Fetch initial state immediately
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected);
      setIsLoading(false);
    });

    // Subscribe to subsequent changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  return { isConnected, isLoading };
}
