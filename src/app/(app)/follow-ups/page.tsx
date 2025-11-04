'use client';
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
import { differenceInDays, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Clock, CalendarCheck, AlertTriangle } from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Household, FollowUpVisit } from '@/lib/types';
import { collection, query, where, collectionGroup } from 'firebase/firestore';

const VisitCard = ({ visit, household }: { visit: FollowUpVisit, household: Household | undefined }) => {

  if (!visit || !household) {
    return null;
  }

  const daysOverdue = differenceInDays(new Date(), new Date(visit.visitDate));

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
            <div className="flex items-center"><CalendarCheck className="mr-2 h-4 w-4" /> Visit Type: <Badge variant="secondary" className="ml-2">{visit.visitType}</Badge></div>
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
  const firestore = useFirestore();
  const { user } = useUser();

  const visitsQuery = useMemoFirebase(
    () => (user ? collectionGroup(firestore, 'followUpVisits') : null),
    [firestore, user]
  );
  const { data: followUpVisits, isLoading: visitsLoading } = useCollection<FollowUpVisit>(visitsQuery);
  
  const householdsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'households') : null),
    [firestore, user]
  );
  const { data: households, isLoading: householdsLoading } = useCollection<Household>(householdsQuery);
  
  const overdue = followUpVisits?.filter((v) => v.status === 'Overdue') ?? [];
  const upcoming = followUpVisits?.filter(
    (v) => isWithinInterval(new Date(v.visitDate), { start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) && v.status === 'Pending'
  ) ?? [];

  const isLoading = visitsLoading || householdsLoading;

  const findHousehold = (householdId: string) => households?.find(h => h.id === householdId);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Follow-Up Visits" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Tabs defaultValue="overdue" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overdue">
              Overdue Visits ({isLoading ? '...' : overdue.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming This Month ({isLoading ? '...' : upcoming.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overdue">
            {isLoading ? <p className="text-center py-16">Loading...</p> : overdue.length > 0 ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                    {overdue.map((visit) => <VisitCard key={visit.id} visit={visit} household={findHousehold(visit.householdId)} />)}
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
             {isLoading ? <p className="text-center py-16">Loading...</p> : upcoming.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                    {upcoming.map((visit) => <VisitCard key={visit.id} visit={visit} household={findHousehold(visit.householdId)} />)}
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
