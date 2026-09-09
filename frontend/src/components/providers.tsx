"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Toast = { id: number; message: string };

const ToastCtx = createContext<{ push: (message: string) => void }>({ push: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  const value = useMemo(() => ({ push }), [push]);

  useEffect(() => {
    const saved = localStorage.getItem("df-theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
  }, []);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[70] space-y-2 md:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto rounded-2xl bg-ink px-4 py-3 text-sm text-cream shadow-xl">
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
