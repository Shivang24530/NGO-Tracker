import { PageHeader } from '@/components/common/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ReportTable } from '@/components/reports/report-table';

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Quarterly Reports" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>
              Select a year and quarter to generate a downloadable report of all
              survey data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportTable />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
