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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b0e14] text-slate-900 dark:text-slate-100 select-none transition-opacity duration-300 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center">

        <img
          src="/app_icon.png"
          alt="MedScheduler Logo"
          className="w-14 h-14 object-contain drop-shadow-md mb-4"
        />

        <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">MedScheduler</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Smart Care Monitor</p>

        <div className="w-48 bg-slate-200 dark:bg-[#151926] border border-slate-300 dark:border-[#222838] rounded-full h-1.5 overflow-hidden mt-6 mb-2">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          Loading application...
        </span>
      </div>
    </div>
  );
}
