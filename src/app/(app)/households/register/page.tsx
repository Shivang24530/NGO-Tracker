import { PageHeader } from '@/components/common/page-header';
import { RegisterHouseholdForm } from '@/components/register-household-form';

export default function RegisterHouseholdPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-secondary/50">
      <PageHeader title="Register New Family">
        <p className="text-sm text-muted-foreground hidden md:block">
            Complete all steps to register a household
        </p>
      </PageHeader>
      <main className="flex flex-1 flex-col items-center gap-4 p-4 md:gap-8 md:p-8">
        <div className="w-full max-w-4xl">
            <RegisterHouseholdForm />
        </div>
      </main>
    </div>
  );
}
