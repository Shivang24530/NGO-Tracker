'use client';

import { AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';

interface OfflineWarningProps {
    className?: string;
    message?: string;
    compact?: boolean;
}

export function OfflineWarning({ className, message, compact = false }: OfflineWarningProps) {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    if (compact) {
        return (
            <div className={`flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200 ${className}`}>
                <AlertTriangle className="h-4 w-4" />
                <span>{message || "Offline: Feature unavailable"}</span>
            </div>
        );
    }

    return (
        <div className={`rounded-md bg-yellow-50 p-4 border border-yellow-200 ${className}`}>
            <div className="flex">
                <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">You are currently offline</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                        <p>
                            {message || "The app may behave unexpectedly. Text data will be saved locally, but photos cannot be uploaded."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
