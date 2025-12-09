"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function MobileAppHandler() {
    const router = useRouter();
    const pathname = usePathname();
    const [pullDistance, setPullDistance] = useState(0);
    const [isPulling, setIsPulling] = useState(false);
    const [canRefresh, setCanRefresh] = useState(false);

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

    useEffect(() => {
        // Disable pull-to-refresh on map pages
        const isMapPage = pathname?.includes('/map');
        if (isMapPage) {
            return; // Don't set up pull-to-refresh on map pages
        }

        // Enhanced pull-to-refresh with visual feedback
        let startY = 0;
        let pulling = false;
        let currentDistance = 0; // Track actual distance locally
        const PULL_THRESHOLD = 100; // Distance to reach before refresh on release

        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                pulling = true;
                currentDistance = 0;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!pulling) return;

            const currentY = e.touches[0].clientY;
            const distance = currentY - startY;
            currentDistance = distance; // Store for touchend

            if (distance > 0) {
                setIsPulling(true);
                // Allow spinner to travel further (up to 150px visual movement)
                setPullDistance(Math.min(distance, 180));

                // Mark as ready to refresh if past threshold
                setCanRefresh(distance > PULL_THRESHOLD);
            }
        };

        const handleTouchEnd = () => {
            // Check local distance value instead of state
            if (currentDistance > PULL_THRESHOLD && pulling) {
                // Only refresh on finger release if threshold was reached
                window.location.reload();
            }

            // Reset state
            pulling = false;
            currentDistance = 0;
            setIsPulling(false);
            setPullDistance(0);
            setCanRefresh(false);
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pathname]);

    // Visual indicator for pull-to-refresh
    if (!isPulling) return null;

    const progress = Math.min((pullDistance / 100) * 100, 100);
    const opacity = Math.min(pullDistance / 40, 1);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: '50%',
                transform: `translateX(-50%) translateY(${Math.min(pullDistance * 0.8, 120)}px)`,
                zIndex: 9999,
                opacity: opacity,
                transition: isPulling ? 'none' : 'all 0.3s ease',
            }}
        >
            <div
                style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    border: `4px solid ${canRefresh ? '#22c55e' : '#e5e7eb'}`,
                    borderTopColor: canRefresh ? '#16a34a' : '#3b82f6',
                    animation: 'none',
                    transform: `rotate(${progress * 3.6}deg)`,
                    backgroundColor: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
            />
            {canRefresh && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#16a34a',
                    whiteSpace: 'nowrap',
                    marginTop: '60px',
                }}>
                    Release to refresh
                </div>
            )}
        </div>
    );
}
