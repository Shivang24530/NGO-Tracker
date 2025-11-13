
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
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Household, Child } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const householdRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, 'households', user.uid) : null),
    [firestore, user]
  );
  const { data: household, isLoading: householdLoading } = useDoc<Household>(householdRef);

  const childrenRef = useMemoFirebase(
    () => (user?.uid ? collection(firestore, 'households', user.uid, 'children') : null),
    [firestore, user]
  );
  const { data: children, isLoading: childrenLoading } = useCollection<Child>(childrenRef);

  const isLoading = isUserLoading || householdLoading || childrenLoading;
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <PageHeader title="Data & Analytics Reports" />
        <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const households = household ? [household] : [];

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Data & Analytics Reports">
        <p className="text-sm text-muted-foreground hidden md:block">
           Visualize your field data to gain insights
        </p>
      </PageHeader>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Age Group Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <AgeGroupChart data={children || []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <GenderChart data={children || []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Current Study Status</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <StudyStatusChart data={children || []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Family Locations</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <LocationChart data={households} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
