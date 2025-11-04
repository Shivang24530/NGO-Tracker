import { PageHeader } from '@/components/common/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GenderChart, LocationChart } from '@/components/analytics/charts';

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Analytics" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Family Locations</CardTitle>
              <CardDescription>Top 10 locations by number of families.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <LocationChart />
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Child Gender Breakdown</CardTitle>
              <CardDescription>Gender distribution across all registered children.</CardDescription>
            </CardHeader>
            <CardContent>
              <GenderChart />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
