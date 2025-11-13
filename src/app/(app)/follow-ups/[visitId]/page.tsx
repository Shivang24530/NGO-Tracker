'use client';

import { PageHeader } from '@/components/common/page-header';
import { ConductVisitForm } from '@/components/conduct-visit-form';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { FollowUpVisit, Household, Child } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';
import { useParams, notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ConductVisitPage() {
  const params = useParams();
  const visitId = params.visitId as string;
  const householdId = params.householdId as string; // This will be needed if we create new visits
  const firestore = useFirestore();

  // We need to know the household to get the visit
  // The householdId might not be in the params if we just have visitId
  // Let's assume for now we get householdId from the visit doc itself.
  
  const { data: visit, isLoading: visitLoading } = useDoc<FollowUpVisit>(
    useMemoFirebase(
      () => (visitId ? doc(firestore, `households/${householdId}/followUpVisits/${visitId}`) : null),
      [firestore, visitId, householdId]
    )
  );

  const { data: household, isLoading: householdLoading } = useDoc<Household>(
    useMemoFirebase(
        () => (visit?.householdId ? doc(firestore, 'households', visit.householdId) : null),
        [firestore, visit]
    )
  );
  
  const { data: householdChildren, isLoading: childrenLoading } = useCollection<Child>(
    useMemoFirebase(
        () => (visit?.householdId ? collection(firestore, 'households', visit.householdId, 'children') : null),
        [firestore, visit]
    )
  );

  const isLoading = visitLoading || householdLoading || childrenLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Visit Details...</p>
      </div>
    );
  }
  
  if (!visit || !household) {
      notFound();
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title={`Conduct Visit: ${household.familyName}`} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <ConductVisitForm
          visit={visit}
          household={household}
          children={householdChildren || []}
        />
      </main>
    </div>
  );
}
