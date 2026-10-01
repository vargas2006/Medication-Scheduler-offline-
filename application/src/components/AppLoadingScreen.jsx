import React, { useState, useEffect } from 'react';

export default function AppLoadingScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setFadingOut(true);
            setTimeout(() => {
              if (onFinish) onFinish();
            }, 200);
          }, 100);
          return 100;
        }
        return prev + 25;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f5f7fa] dark:bg-[#0f172a] text-[#172033] dark:text-slate-100 select-none transition-opacity duration-200 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        {/* Brand Icon */}
        <img
          src="/app_icon.png"
          alt="MedScheduler Logo"
          className="w-12 h-12 object-contain mb-3"
        />

        {/* Brand Name & Subtitle */}
        <h1 className="text-lg font-bold text-[#172033] dark:text-slate-100 tracking-tight">
          MedScheduler
        </h1>
        <p className="text-xs text-[#64748b] dark:text-slate-400 mt-0.5">
          Healthcare &amp; Inventory Management
        </p>

        {/* Minimal Progress Bar */}
        <div className="w-44 bg-[#e2e8f0] dark:bg-[#1e293b] border border-[#d9e0e8] dark:border-[#334155] rounded-full h-1.5 overflow-hidden mt-5 mb-2">
          <div
            className="h-full bg-[#2563eb] transition-all duration-200 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-[11px] text-[#64748b] dark:text-slate-400 font-normal">
          Loading application engine...
        </span>
      </div>
    </div>
  );
}
