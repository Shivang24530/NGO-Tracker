'use client';

import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff } from 'lucide-react';

export function GlobalOfflineBanner() {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    return (
        <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top sticky top-0 z-50 shadow-sm">
            <WifiOff className="h-4 w-4" />
            <span>The app is offline. Keep refreshing to sync the display after making any changes.</span>
        </div>
    );
}
