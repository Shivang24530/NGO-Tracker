'use client';

import { PageHeader } from '@/components/common/page-header';
import { EditHouseholdForm } from '@/components/edit-household-form';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Household, Child } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from "@/contexts/LanguageContext";

export default function EditHouseholdPage() {
  const { t } = useLanguage();

  const searchParams = useSearchParams();
  const householdId = searchParams.get('id');
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
        <p className="mt-4 text-muted-foreground">{t("loading_family_details")}</p>
      </div>
    );
  }

  if (!household || !householdChildren) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold mb-2">{t("family_not_found")}</h2>
        <p className="text-muted-foreground mb-4">
          {t("family_not_found_desc")} <code>{householdId}</code>.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => history.back()}>{t("go_back")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary/50">
      <PageHeader title={`${t("edit_family")}: ${household.familyName}`}>
        <p className="text-sm text-muted-foreground hidden md:block">
          {t("edit_family_subtitle")} {household.familyName}
        </p>
      </PageHeader>

      <main className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="w-full max-w-4xl">
          <EditHouseholdForm
            household={household}
            initialChildren={householdChildren}
          />
        </div>
      </main>
    </div>
  );
}
