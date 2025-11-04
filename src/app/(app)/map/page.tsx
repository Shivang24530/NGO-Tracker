import { PageHeader } from '@/components/common/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MapView } from '@/components/map/map-view';
import { households, followUpVisits } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin } from 'lucide-react';

export default function MapOverviewPage() {
    const householdsWithVisits = households.map(h => {
        const visit = followUpVisits.find(v => v.householdId === h.id);
        return {
            ...h,
            visitStatus: visit?.status,
        };
    });

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return (
             <div className="flex min-h-screen w-full flex-col">
                <PageHeader title="Map Overview" />
                <main className="flex-1 p-4 md:p-8">
                     <Alert variant="destructive">
                        <MapPin className="h-4 w-4" />
                        <AlertTitle>Configuration Error</AlertTitle>
                        <AlertDescription>
                            Google Maps API key is missing. Please add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment variables.
                        </AlertDescription>
                    </Alert>
                </main>
            </div>
        )
    }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Map Overview" />
      <main className="flex-1 grid grid-cols-1">
        <MapView households={householdsWithVisits} apiKey={apiKey} />
      </main>
    </div>
  );
}
