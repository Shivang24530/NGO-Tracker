"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function MobileAppHandler() {
    const router = useRouter();
    // const pathname = usePathname(); // Unused


    useEffect(() => {
        // Only run on mobile (Capacitor environment)
        if (typeof window === 'undefined' || !(window as any).Capacitor) {
            return;
        }

        // Handle Android back button
        const setupBackButton = async () => {
            try {
                const { App } = await import('@capacitor/app');
                const handle = await App.addListener('backButton', ({ canGoBack }) => {
                    if (canGoBack) {
                        router.back();
                    } else {
                        App.minimizeApp();
                    }
                });

                return () => {
                    handle.remove();
                };
            } catch (error) {
                console.log('Back button setup failed:', error);
            }
        };

        setupBackButton();
    }, [router]);

    // Pull-to-refresh logic removed as per user request
    return null;
}
