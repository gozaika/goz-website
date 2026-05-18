"use client";

import { useEffect, useMemo, useState } from "react";

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function HoldCountdown({ expiresAt }: { readonly expiresAt: string }) {
  const expiry = useMemo(() => new Date(expiresAt).valueOf(), [expiresAt]);
  const [remainingMs, setRemainingMs] = useState(() => expiry - Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingMs(expiry - Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiry]);

  if (remainingMs <= 0) {
    return <span className="font-semibold text-red-700">Expired - availability returns after the release job runs.</span>;
  }

  return <span className="font-semibold text-[#1A5C38]">Expires in {formatRemaining(remainingMs)}</span>;
}
