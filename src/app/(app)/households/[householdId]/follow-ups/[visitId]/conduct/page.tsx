'use client';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { ConductVisitForm } from '@/components/conduct-visit-form';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { FollowUpVisit, Household, Child } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";

export default function ConductVisitPage() {
  const { t } = useLanguage();

  const params = useParams();
  const visitId = params.visitId as string;
  const householdId = params.householdId as string;
  const firestore = useFirestore();

  const visitRef = useMemoFirebase(
    () =>
      visitId && householdId
        ? doc(firestore, `households/${householdId}/followUpVisits/${visitId}`)
        : null,
    [firestore, visitId, householdId]
  );
  const { data: visit, isLoading: visitLoading } = useDoc<FollowUpVisit>(visitRef);

  const householdRef = useMemoFirebase(
    () => (householdId ? doc(firestore, 'households', householdId) : null),
    [firestore, householdId]
  );
  const { data: household, isLoading: householdLoading } =
    useDoc<Household>(householdRef);

  const childrenRef = useMemoFirebase(
    () =>
      householdId
        ? collection(firestore, 'households', householdId, 'children')
        : null,
    [firestore, householdId]
  );
  const { data: householdChildren, isLoading: childrenLoading } =
    useCollection<Child>(childrenRef);

  const isLoading = visitLoading || householdLoading || childrenLoading;

  // -------------------- LOADING --------------------
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{t("loading_visit_details")}</p>
      </div>
    );
  }

  // -------------------- NOT FOUND --------------------
  if (!visit || !household) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold mb-2">{t("visit_or_household_not_found")}</h2>
        <p className="text-muted-foreground mb-4">
          {t("visit_or_household_not_found_desc")}
        </p>

        <p className="text-sm text-muted-foreground mb-4">
          {t("household_id")}: <code>{householdId}</code>
          <br />
          {t("visit_id")}: <code>{visitId}</code>
        </p>

        <div className="flex gap-2">
          <Button onClick={() => history.back()}>{t("go_back")}</Button>
        </div>
      </div>
    );
  }

  // -------------------- PAGE --------------------
  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title={`${t("conduct_visit")}: ${household.familyName}`} />

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
