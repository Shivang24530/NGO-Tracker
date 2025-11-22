'use client';

import { PageHeader } from '@/components/common/page-header';
import { MapView } from '@/components/map/map-view';
import type { Household, FollowUpVisit } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, Loader2 } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from "@/contexts/LanguageContext";

type LatLng = {
  lat: number;
  lng: number;
};

export default function MapOverviewPage() {
  const { t } = useLanguage();

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [authFailed, setAuthFailed] = useState(false);
  const [center, setCenter] = useState<LatLng | null>(null);
  const [allVisits, setAllVisits] = useState<FollowUpVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);

  const householdsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(
            collection(firestore, 'households'),
            where('ownerId', '==', user.uid)
          )
        : null,
    [firestore, user]
  );
  const { data: households, isLoading: householdsLoading } =
    useCollection<Household>(householdsQuery);

  // Fetch all visits
  useEffect(() => {
    if (households === null) {
      setVisitsLoading(true);
      return;
    }

    if (households.length === 0) {
      setAllVisits([]);
      setVisitsLoading(false);
      return;
    }

    const fetchAllVisits = async () => {
      if (!firestore) return;
      setVisitsLoading(true);
      try {
        const visitsPromises = households.map((h) =>
          getDocs(collection(firestore, 'households', h.id, 'followUpVisits'))
        );
        const visitsSnapshots = await Promise.all(visitsPromises);
        const visitsData = visitsSnapshots.flatMap((snap) =>
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FollowUpVisit))
        );
        setAllVisits(visitsData);
      } catch (error) {
        console.error('Error fetching all visits for map:', error);
        setAllVisits([]);
      } finally {
        setVisitsLoading(false);
      }
    };
    fetchAllVisits();
  }, [firestore, households]);

  // Get user location or fallback
  useEffect(() => {
    let isMounted = true;
    let watchId: number;

    const fallbackToDefaultLocation = () => {
      if (isMounted) {
        setCenter({ lat: 28.7041, lng: 77.1025 });
      }
    };

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (isMounted) {
            setCenter({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
        },
        () => fallbackToDefaultLocation(),
        { enableHighAccuracy: true }
      );
    } else {
      fallbackToDefaultLocation();
    }

    return () => {
      isMounted = false;
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const householdsWithVisits = useMemo(() => {
    if (!households || !allVisits) return [];
    return households.map((h) => {
      const visit = allVisits.find((v) => v.householdId === h.id);
      return {
        ...h,
        visitStatus: visit?.status,
      };
    });
  }, [households, allVisits]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const isLoading =
    isUserLoading || householdsLoading || visitsLoading || !center;

  // API KEY missing
  if (!apiKey) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <PageHeader title={t("map_overview")} />
        <main className="flex-1 p-4 md:p-8">
          <Alert variant="destructive">
            <MapPin className="h-4 w-4" />
            <AlertTitle>{t("config_error")}</AlertTitle>
            <AlertDescription>
              {t("missing_api_key")}
              <br />
              <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  // Auth Failed
  if (authFailed) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <PageHeader title={t("map_overview")} />
        <main className="flex-1 p-4 md:p-8">
          <Alert variant="destructive">
            <MapPin className="h-4 w-4" />
            <AlertTitle>{t("map_auth_failed")}</AlertTitle>
            <AlertDescription>
              <p>{t("map_auth_desc")}</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>{t("map_check_key")}</li>
                <li>{t("map_enable_api")}</li>
                <li>{t("map_billing_required")}</li>
                <li>{t("map_http_referrer")}</li>
              </ul>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  // Main content
  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title={t("map_overview")} />

      <main className="flex-1 grid grid-cols-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <div
            className="h-full w-full"
            onMouseOverCapture={(e) => {
              const target = e.target as any;
              const className =
                typeof target.className === 'string'
                  ? target.className
                  : target.className?.baseVal || '';

              if (className.includes('gm-auth-failure-icon')) {
                setAuthFailed(true);
              }
            }}
          >
            <MapView
              households={householdsWithVisits || []}
              apiKey={apiKey}
              center={center}
            />
          </div>
        )}
      </main>
    </div>
  );
}
