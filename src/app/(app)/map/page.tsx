
'use client';

import { PageHeader } from '@/components/common/page-header';
import { MapView } from '@/components/map/map-view';
import type { Household, FollowUpVisit } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';

type LatLng = {
  lat: number;
  lng: number;
};

export default function MapOverviewPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const [authFailed, setAuthFailed] = useState(false);
    const [center, setCenter] = useState<LatLng | null>(null);
    const [allVisits, setAllVisits] = useState<FollowUpVisit[]>([]);
    const [visitsLoading, setVisitsLoading] = useState(true);

    const householdsQuery = useMemoFirebase(
      () => (firestore && user ? query(collection(firestore, 'households'), where('ownerId', '==', user.uid)) : null),
      [firestore, user]
    );
    const { data: households, isLoading: householdsLoading } = useCollection<Household>(householdsQuery);

    useEffect(() => {
        if (!firestore || households === null) {
            setVisitsLoading(true);
            return;
        }

        if (households.length === 0) {
            setAllVisits([]);
            setVisitsLoading(false);
            return;
        }

        const fetchAllVisits = async () => {
            setVisitsLoading(true);
            try {
                const visitsPromises = households.map(h => 
                    getDocs(collection(firestore, 'households', h.id, 'followUpVisits'))
                );
                const visitsSnapshots = await Promise.all(visitsPromises);
                const visitsData = visitsSnapshots.flatMap(snap => 
                    snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FollowUpVisit))
                );
                setAllVisits(visitsData);
            } catch (error) {
                console.error("Error fetching all visits for map:", error);
                setAllVisits([]);
            } finally {
                setVisitsLoading(false);
            }
        };
        fetchAllVisits();
    }, [firestore, households]);

    useEffect(() => {
        let isMounted = true;
        
        const fallbackToDefaultLocation = () => {
            if (isMounted) {
                // A reasonable default if no other location is available
                setCenter({ lat: 28.7041, lng: 77.1025 });
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (isMounted) {
                        setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
                    }
                },
                () => {
                    // Geolocation failed or denied, use fallback
                    fallbackToDefaultLocation();
                }
            );
        } else {
            // Geolocation not supported, use fallback
            fallbackToDefaultLocation();
        }

        return () => {
            isMounted = false;
        };
    }, []);

    const householdsWithVisits = useMemo(() => {
        if (!households || !allVisits) return [];
        return households.map(h => {
            const visit = allVisits.find(v => v.householdId === h.id);
            // This is a simplified status. A more robust solution would check dates.
            const status = visit?.status === 'Completed' ? 'Completed' : 'Pending';
            return {
                ...h,
                visitStatus: visit?.status,
            };
        });
    }, [households, allVisits]);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    const isLoading = isUserLoading || householdsLoading || visitsLoading || !center;

    if (!apiKey) {
        return (
             <div className="flex min-h-screen w-full flex-col">
                <PageHeader title="Map Overview" />
                <main className="flex-1 p-4 md:p-8">
                     <Alert variant="destructive">
                        <MapPin className="h-4 w-4" />
                        <AlertTitle>Configuration Error</AlertTitle>
                        <AlertDescription>
                            Google Maps API key is missing. Please add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_API_KEY_HERE"</code> to your <code>.env</code> file.
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
                            <p>The Google Maps API key is not working. Please check the following:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>The API key in your <code>.env</code> file is correct and has no typos.</li>
                                <li>The "Maps JavaScript API" is enabled in your Google Cloud Console.</li>
                                <li><b>A billing account is linked to your Google Cloud project.</b> Google Maps Platform products now require a valid billing account.</li>
                                <li><b>Important:</b> The key's "Application restrictions" are set to "HTTP referrers" and your app's domain (e.g., <code>*.your-domain.com</code>) is on the allowed list to prevent unauthorized use.</li>
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
                const target = e.target as any;
                // Handle both string class names (HTML) and object class names (SVG)
                const className = typeof target.className === 'string' 
                    ? target.className 
                    : (target.className?.baseVal || '');
                
                if (className.includes('gm-auth-failure-icon')) {
                    setAuthFailed(true);
                }
            }}>
                <MapView households={householdsWithVisits || []} apiKey={apiKey} center={center} />
            </div>
        )}
      </main>
    </div>
  );
}
