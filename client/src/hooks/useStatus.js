// client/src/hooks/useStatus.js
import { useEffect, useCallback, useRef } from "react";
import api from "../api/axios";

const HEARTBEAT_INTERVAL = 60_000; // 60 seconds
const IDLE_TIMEOUT = 10 * 60_000; // 10 minutes (matches server)

export function useStatus() {
  const idleTimer = useRef(null);
  const heartbeatRef = useRef(null);
  const isAway = useRef(false);

  // 1. Memoize Heartbeat to prevent effect re-runs
  const heartbeat = useCallback(async () => {
    try {
      // This is the call that flips "Offline" to "Online" on the backend
      await api.patch('/status/heartbeat'); 
      if (isAway.current) isAway.current = false;
    } catch (err) {
      console.error("Heartbeat failed", err);
    }
  }, []);

  // 2. Memoize goAway
  const goAway = useCallback(async () => {
    if (isAway.current) return;
    isAway.current = true;
    try {
      await api.patch("/status", { status: "Away" });
    } catch {
      /* silent */
    }
  }, []);

  // 3. Reset idle timer on any user activity
  const resetIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    
    // If user was "Away" and starts moving, immediately trigger heartbeat
    if (isAway.current) {
      heartbeat();
    }
    
    idleTimer.current = setTimeout(goAway, IDLE_TIMEOUT);
  }, [goAway, heartbeat]);

  useEffect(() => {
    // Initial heartbeat on mount
    heartbeat();
    
    // Start interval
    heartbeatRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    // Activity Listeners
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) =>
      window.addEventListener(e, resetIdle, { passive: true }),
    );
    
    resetIdle(); // Start the 10-minute countdown

    // 4. Handle Tab Closure (SendBeacon)
    const handleUnload = () => {
      const token = localStorage.getItem("tf_token");
      if (token) {
        // Beacon needs full URL if not proxied
        const url = (api.defaults.baseURL || '') + "/status";
        const data = JSON.stringify({ status: "Offline" });
        navigator.sendBeacon(url, new Blob([data], { type: "application/json" }));
      }
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(heartbeatRef.current);
      clearTimeout(idleTimer.current);
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [heartbeat, resetIdle]);
}