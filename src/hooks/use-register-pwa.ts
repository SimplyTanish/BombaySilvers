import { useEffect } from "react";

function registerSWClientSide() {
  const registerSW = async () => {
    if (!("serviceWorker" in navigator)) return;
    if (import.meta.env.DEV) return;

    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      if (reg.active) {
        // Fresh SW took control without a reload; tell it to claim now.
        reg.active.postMessage({ type: "SKIP_WAITING" });
      }
    } catch (err) {
      console.warn("[PWA] Service worker registration failed:", err);
    }
  };

  void registerSW();
}

export function useRegisterPWA() {
  useEffect(() => {
    if (import.meta.env.SSR) return;
    registerSWClientSide();
  }, []);
}
