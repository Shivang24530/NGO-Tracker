
'use client';

import { PageHeader } from '@/components/common/page-header';
import { MapView } from '@/components/map/map-view';
import type { Household, FollowUpVisit } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { useState } from 'react';

export default function MapOverviewPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const [authFailed, setAuthFailed] = useState(false);

    const householdsQuery = useMemoFirebase(
      () => (user?.uid ? query(collection(firestore, 'households'), where('id', '==', user.uid)) : null),
      [firestore, user]
    );
    const { data: households, isLoading: householdsLoading } = useCollection<Household>(householdsQuery);

    const visitsQuery = useMemoFirebase(
        () => (user?.uid ? query(collection(firestore, 'households', user.uid, 'followUpVisits')) : null),
        [firestore, user]
    );
    const { data: followUpVisits, isLoading: visitsLoading } = useCollection<FollowUpVisit>(visitsQuery);

    const householdsWithVisits = useMemoFirebase(() => {
        if (!households || !followUpVisits) return [];
        return households.map(h => {
            const visit = followUpVisits.find(v => v.householdId === h.id);
            return {
                ...h,
                visitStatus: visit?.status,
            };
        });
    }, [households, followUpVisits]);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    const isLoading = isUserLoading || householdsLoading || visitsLoading;

    if (!apiKey) {
        return (
             <div className="flex min-h-screen w-full flex-col">
                <PageHeader title="Map Overview" />
                <main className="flex-1 p-4 md:p-8">
                     <Alert variant="destructive">
                        <MapPin className="h-4 w-4" />
                        <AlertTitle>Configuration Error</AlertTitle>
                        <AlertDescription>
                            Google Maps API key is missing. Please add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your <code>.env</code> file.
                        </AlertDescription>
                    </Alert>
                </main>
            </div>
        )
    }

    if (authFailed) {
        return (
             <div className="flex min-h-screen w-full flex-col">
                <PageHeader title="Map Overview" />
                <main className="flex-1 p-4 md:p-8">
                     <Alert variant="destructive">
                        <MapPin className="h-4 w-4" />
                        <AlertTitle>Map Authentication Failed</AlertTitle>
                        <AlertDescription>
                            <p>The Google Maps API key provided is not working. Please check the following:</p>
                            <ul className="list-disc pl-5 mt-2">
                                <li>The API key in your <code>.env</code> file is correct.</li>
                                <li>The "Maps JavaScript API" is enabled in your Google Cloud Console.</li>
                                <li>A billing account is linked to your Google Cloud project.</li>
                                <li>The key's restrictions (e.g., HTTP referrers) allow requests from this app's domain.</li>
                            </ul>
                        </AlertDescription>
                    </Alert>
                </main>
            </div>
        )
    }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Map Overview" />
      <main className="flex-1 grid grid-cols-1">
        {isLoading ? (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        ) : (
            <div className='h-full w-full' onMouseOverCapture={(e) => {
                const target = e.target as HTMLElement;
                if (target.className.includes('gm-auth-failure-icon')) {
                    setAuthFailed(true);
                }
            }}>
                <MapView households={householdsWithVisits || []} apiKey={apiKey} />
            </div>
        )}
      </main>
    </div>
  );
}
