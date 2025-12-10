"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ModeBannerProps {
  isDemo: boolean;
}

export default function ModeBanner({ isDemo }: ModeBannerProps) {
  const router = useRouter();
  const [isChangingMode, setIsChangingMode] = useState(false);

  const handleSwitchMode = async () => {
    setIsChangingMode(true);

    // Delete the mode cookie by setting it to expired
    document.cookie = "timesheet_mode=; path=/; max-age=0";

    // Redirect to mode selector
    router.push("/select-mode");
  };

  if (isDemo) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎭</span>
            <div>
              <p className="font-semibold">Demo Mode</p>
              <p className="text-xs text-blue-100">Viewing synthetic data · Not connected to real Slack integration</p>
            </div>
          </div>

          <button onClick={handleSwitchMode} disabled={isChangingMode} className="px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50">
            {isChangingMode ? "Switching..." : "Switch to Personal"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-semibold">Personal Mode</p>
            <p className="text-xs text-green-100">Connected to your real timesheet data</p>
          </div>
        </div>

        <button onClick={handleSwitchMode} disabled={isChangingMode} className="px-4 py-2 bg-white text-green-600 rounded-md hover:bg-green-50 transition-colors text-sm font-medium disabled:opacity-50">
          {isChangingMode ? "Switching..." : "Switch to Demo"}
        </button>
      </div>
    </div>
  );
}
