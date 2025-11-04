import { PageHeader } from '@/components/common/page-header';
import { ConductVisitForm } from '@/components/conduct-visit-form';
import { followUpVisits, households, children } from '@/lib/data';
import { notFound } from 'next/navigation';

export default function ConductVisitPage({ params }: { params: { visitId: string } }) {
  const visit = followUpVisits.find((v) => v.id === params.visitId);
  if (!visit) {
    notFound();
  }
  const household = households.find((h) => h.id === visit.householdId);
  if (!household) {
    notFound();
  }
  const householdChildren = children.filter((c) => c.householdId === household.id);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title={`Conduct Visit: ${household.familyName}`} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <ConductVisitForm
          visit={visit}
          household={household}
          children={householdChildren}
        />
      </main>
    </div>
  );
}
