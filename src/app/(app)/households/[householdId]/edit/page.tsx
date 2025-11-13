
'use client';

import { PageHeader } from '@/components/common/page-header';
import { EditHouseholdForm } from '@/components/edit-household-form';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Household, Child } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditHouseholdPage() {
  const params = useParams();
  const householdId = params.householdId as string;
  const firestore = useFirestore();

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
  
  const isLoading = householdLoading || childrenLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Family Details...</p>
      </div>
    );
  }

  if (!household || !householdChildren) {
    return (
       <div className="flex min-h-screen w-full flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold mb-2">Family Not Found</h2>
        <p className="text-muted-foreground mb-4">
          We could not locate the family with ID: <code>{householdId}</code>.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => history.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary/50">
      <PageHeader title={`Edit Family: ${household.familyName}`}>
         <p className="text-sm text-muted-foreground hidden md:block">
            Update details for the {household.familyName} family.
        </p>
      </PageHeader>
      <main className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="w-full max-w-4xl">
            <EditHouseholdForm household={household} initialChildren={householdChildren} />
        </div>
      </main>
    </div>
  );
}
