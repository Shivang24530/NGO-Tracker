import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Initial check
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        // Handler for web events
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Handler for Capacitor Network plugin
        const setupNetworkListener = async () => {
            try {
                const status = await Network.getStatus();
                setIsOnline(status.connected);

                await Network.addListener('networkStatusChange', status => {
                    setIsOnline(status.connected);
                });
            } catch (e) {
                console.error("Network plugin error:", e);
            }
        };

        if (Capacitor.isNativePlatform()) {
            setupNetworkListener();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (Capacitor.isNativePlatform()) {
                Network.removeAllListeners();
            }
        };
    }, []);

    return isOnline;
}
