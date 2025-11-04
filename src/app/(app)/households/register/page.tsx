import { PageHeader } from '@/components/common/page-header';
import { RegisterHouseholdForm } from '@/components/register-household-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterHouseholdPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Register New Family" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Family Registration Wizard</CardTitle>
            <CardDescription>
              Follow the steps to add a new family to the program.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterHouseholdForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
