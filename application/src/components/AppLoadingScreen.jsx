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
            }, 300);
          }, 150);
          return 100;
        }
        return prev + 25;
      });
    }, 180);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0d0f17] text-slate-100 select-none transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#141724] border border-[#242a3e] flex items-center justify-center text-3xl shadow-xl mb-4">
          💊
        </div>

        {/* Brand Name & Subtitle */}
        <h1 className="text-xl font-bold text-white tracking-tight">MedScheduler</h1>
        <p className="text-xs text-slate-400 mt-1">Smart Care Monitor</p>

        {/* Minimal Progress Bar */}
        <div className="w-48 bg-[#161926] border border-[#24293e] rounded-full h-1.5 overflow-hidden mt-6 mb-2">
          <div
            className="h-full bg-gradient-to-r from-[#7c3aed] to-[#38bdf8] transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-[11px] text-slate-500 font-medium">
          Loading application...
        </span>
      </div>
    </div>
  );
}
