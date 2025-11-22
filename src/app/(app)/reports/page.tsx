'use client';

import { PageHeader } from '@/components/common/page-header';
import { QuarterlyReport } from '@/components/reports/quarterly-report';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReportsPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <PageHeader title={t("quarterly_reports")} />

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <p className="text-muted-foreground">
          {t("quarterly_reports_desc")}
        </p>

        <QuarterlyReport />
      </main>
    </div>
  );
}
