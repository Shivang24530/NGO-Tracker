'use client';
import { PageHeader } from '@/components/common/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { QuarterlyReport } from '@/components/reports/quarterly-report';

export default function ReportsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <PageHeader title="Quarterly Survey Reports" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <p className="text-muted-foreground">
          View survey completion status and download data for each quarter.
        </p>
        <QuarterlyReport />
      </main>
    </div>
  );
}
