
'use client';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ConductVisitForm } from '@/components/conduct-visit-form';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { FollowUpVisit, Household, Child } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';
import { useParams, notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ConductVisitPage() {
  const params = useParams();
  const visitId = params.visitId as string;
  const householdId = params.householdId as string;
  const firestore = useFirestore();

  const visitRef = useMemoFirebase(
      () => (visitId && householdId ? doc(firestore, `households/${householdId}/followUpVisits/${visitId}`) : null),
      [firestore, visitId, householdId]
  );
  const { data: visit, isLoading: visitLoading } = useDoc<FollowUpVisit>(visitRef);

  const householdRef = useMemoFirebase(
      () => (householdId ? doc(firestore, 'households', householdId) : null),
      [firestore, householdId]
  );
  const { data: household, isLoading: householdLoading } = useDoc<Household>(householdRef);
  
  const childrenRef = useMemoFirebase(
      () => (householdId ? collection(firestore, 'households', householdId, 'children') : null),
      [firestore, householdId]
  );
  const { data: householdChildren, isLoading: childrenLoading } = useCollection<Child>(childrenRef);

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
    console.warn('ConductVisitPage: missing visit or household', {
      params,
      visit,
      household,
      visitLoading,
      householdLoading,
      childrenLoading,
    });

    // You may choose to show 404 or a user-friendly message.
    // For debugging & safer UX we render a message and a link back.
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold mb-2">Visit or Household Not Found</h2>
        <p className="text-muted-foreground mb-4">
          We could not locate the visit or household for the provided IDs.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          householdId: <code>{householdId}</code><br />
          visitId: <code>{visitId}</code>
        </p>
        <div className="flex gap-2">
          <Button onClick={() => history.back()}>Go Back</Button>
        </div>
      </div>
    );
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
