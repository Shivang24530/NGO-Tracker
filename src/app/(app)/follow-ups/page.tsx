import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { followUpVisits, households } from '@/lib/data';
import { differenceInDays, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarCheck, AlertTriangle } from 'lucide-react';

const overdue = followUpVisits.filter((v) => v.status === 'Overdue');
const upcoming = followUpVisits.filter(
  (v) => isWithinInterval(parseISO(v.visitDate), { start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) && v.status === 'Pending'
);

const VisitCard = ({ visitId }: { visitId: string }) => {
  const visit = followUpVisits.find(v => v.id === visitId);
  const household = households.find(h => h.id === visit?.householdId);

  if (!visit || !household) {
    return null;
  }

  const daysOverdue = differenceInDays(new Date(), parseISO(visit.visitDate));

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex justify-between items-start">
          {household.familyName}
          {visit.status === 'Overdue' && (
             <Badge variant="destructive">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {daysOverdue} days overdue
             </Badge>
          )}
        </CardTitle>
        <CardDescription>{household.fullAddress}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground space-y-2">
            <p className="flex items-center"><Clock className="mr-2 h-4 w-4" /> Last visit: {new Date(visit.visitDate).toLocaleDateString()}</p>
            <p className="flex items-center"><CalendarCheck className="mr-2 h-4 w-4" /> Visit Type: <Badge variant="secondary" className="ml-2">{visit.visitType}</Badge></p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full font-headline bg-primary hover:bg-primary/90">
          <Link href={`/follow-ups/${visit.id}/conduct`}>Start Visit</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function FollowUpsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Follow-Up Visits" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Tabs defaultValue="overdue" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overdue">
              Overdue Visits ({overdue.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming This Month ({upcoming.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overdue">
            {overdue.length > 0 ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                    {overdue.map((visit) => <VisitCard key={visit.id} visitId={visit.id} />)}
                </div>
            ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <CalendarCheck className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">All Caught Up!</h3>
                    <p>There are no overdue visits.</p>
                </div>
            )}
          </TabsContent>
          <TabsContent value="upcoming">
            {upcoming.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                    {upcoming.map((visit) => <VisitCard key={visit.id} visitId={visit.id} />)}
                </div>
            ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <CalendarCheck className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">Nothing Scheduled</h3>
                    <p>There are no upcoming visits scheduled for this month.</p>
                </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
