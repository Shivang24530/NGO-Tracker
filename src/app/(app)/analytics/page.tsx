'use client';

import { PageHeader } from '@/components/common/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AgeGroupChart,
  GenderChart,
  StudyStatusChart,
  LocationChart,
} from '@/components/analytics/charts';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { Household, Child } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { calculateAge } from '@/lib/utils';
import { useLanguage } from "@/contexts/LanguageContext";

export default function AnalyticsPage() {
  const { t } = useLanguage();

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);

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

  // Fetch children from all households
  useEffect(() => {
    if (households === null) {
      setChildrenLoading(true);
      return;
    }

    if (households.length === 0) {
      setAllChildren([]);
      setChildrenLoading(false);
      return;
    }

    const fetchAllChildren = async () => {
      if (!firestore) return;
      setChildrenLoading(true);
      try {
        const childrenPromises = households.map((h) =>
          getDocs(collection(firestore, 'households', h.id, 'children'))
        );
        const childrenSnapshots = await Promise.all(childrenPromises);
        const childrenData = childrenSnapshots.flatMap((snap) =>
          snap.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Child)
          )
        );
        setAllChildren(childrenData);
      } catch (error) {
        console.error('Error fetching all children for analytics:', error);
        setAllChildren([]);
      } finally {
        setChildrenLoading(false);
      }
    };

    fetchAllChildren();
  }, [firestore, households]);

  const isLoading =
    isUserLoading || householdsLoading || childrenLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <PageHeader title={t("analytics_title")} />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title={t("analytics_title")}>
        <p className="text-sm text-muted-foreground hidden md:block">
          {t("analytics_subtitle")}
        </p>
      </PageHeader>

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">

          {/* Age Group */}
          <Card>
            <CardHeader>
              <CardTitle>{t("age_group_distribution")}</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <AgeGroupChart data={allChildren} />
            </CardContent>
          </Card>

          {/* Gender */}
          <Card>
            <CardHeader>
              <CardTitle>{t("gender_distribution")}</CardTitle>
            </CardHeader>
            <CardContent>
              <GenderChart data={allChildren} />
            </CardContent>
          </Card>

          {/* Study Status */}
          <Card>
            <CardHeader>
              <CardTitle>{t("study_status")}</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <StudyStatusChart data={allChildren} />
            </CardContent>
          </Card>

          {/* Top Locations */}
          <Card>
            <CardHeader>
              <CardTitle>{t("top_locations")}</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <LocationChart data={households || []} />
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
