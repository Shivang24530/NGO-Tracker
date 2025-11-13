
'use client';
import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  isThisMonth,
  isPast,
  isSameDay,
  endOfDay,
} from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CalendarCheck,
  AlertCircle,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import type { Household, FollowUpVisit } from '@/lib/types';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';

const StatCard = ({ title, value, icon: Icon, color, isLoading }: { title: string; value: number | string, icon: React.ElementType, color: string, isLoading: boolean }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`flex items-center justify-center h-8 w-8 rounded-full bg-${color}-100`}>
             <Icon className={`h-5 w-5 text-${color}-600`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{isLoading ? '...' : value}</div>
      </CardContent>
    </Card>
);

export default function FollowUpsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const householdsQuery = useMemoFirebase(
    () =>
      user?.uid ? query(collection(firestore, 'households'), where('id', '==', user.uid)) : null,
    [firestore, user]
  );
  const { data: households, isLoading: householdsLoading } =
    useCollection<Household>(householdsQuery);

  const visitsQuery = useMemoFirebase(
    () =>
      user?.uid
        ? query(collection(firestore, 'households', user.uid, 'followUpVisits'))
        : null,
    [firestore, user]
  );
  const { data: followUpVisits, isLoading: visitsLoading } =
    useCollection<FollowUpVisit>(visitsQuery);
  

  const now = new Date();
  
  const overdue =
    followUpVisits?.filter(
      (v) =>
        v.status === 'Pending' &&
        isPast(new Date(v.visitDate)) &&
        !isSameDay(new Date(v.visitDate), now)
    ) ?? [];

  const upcoming =
    followUpVisits?.filter(
      (v) => v.status === 'Pending' && isThisMonth(new Date(v.visitDate))
    ) ?? [];
  
  const completed =
    followUpVisits?.filter((v) => v.status === 'Completed') ?? [];

  const recentVisits = 
    completed.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()).slice(0, 5) ?? [];

  const totalFamilies = households?.length ?? 0;

  const isLoading = isUserLoading || visitsLoading || householdsLoading;

  const findHouseholdName = (householdId: string) =>
    households?.find((h) => h.id === householdId)?.familyName;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Follow-up Visits">
        <p className="text-sm text-muted-foreground hidden md:block">
           Track and manage quarterly visits to registered families
        </p>
      </PageHeader>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Overdue Visits" value={overdue.length} icon={AlertCircle} color="red" isLoading={isLoading} />
            <StatCard title="Due This Month" value={upcoming.length} icon={Clock} color="orange" isLoading={isLoading} />
            <StatCard title="Visits Completed" value={completed.length} icon={CalendarCheck} color="green" isLoading={isLoading} />
            <StatCard title="Total Families" value={totalFamilies} icon={Users} color="blue" isLoading={isLoading} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-red-500" /> Overdue Visits ({overdue.length})</CardTitle>
                </CardHeader>
                <CardContent>
                {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : overdue.length > 0 ? (
                    <div className="space-y-4">
                        {overdue.map((visit) => {
                            const householdName = findHouseholdName(visit.householdId);
                            return (
                                <Link href={`/follow-ups/${visit.id}/conduct`} key={visit.id} className="block border p-4 rounded-lg hover:bg-secondary">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{householdName}</p>
                                        <p className="text-sm text-muted-foreground">{new Date(visit.visitDate).toLocaleDateString()}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{households?.find(h => h.id === visit.householdId)?.locationArea}</p>
                                </Link>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground space-y-2">
                        <CalendarCheck className="mx-auto h-12 w-12 text-green-500" />
                        <h3 className="font-semibold">No overdue visits!</h3>
                        <p>Great work!</p>
                    </div>
                )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-orange-500" /> Upcoming This Month ({upcoming.length})</CardTitle>
                </CardHeader>
                <CardContent>
                {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : upcoming.length > 0 ? (
                    <div className="space-y-4">
                        {upcoming.map((visit) => {
                             const householdName = findHouseholdName(visit.householdId);
                             return (
                                <Link href={`/follow-ups/${visit.id}/conduct`} key={visit.id} className="block border p-4 rounded-lg hover:bg-secondary">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{householdName}</p>
                                        <p className="text-sm text-muted-foreground">{new Date(visit.visitDate).toLocaleDateString()}</p>
                                    </div>
                                     <p className="text-sm text-muted-foreground">{households?.find(h => h.id === visit.householdId)?.locationArea}</p>
                                </Link>
                             )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground space-y-2">
                        <CalendarCheck className="mx-auto h-12 w-12" />
                        <h3 className="font-semibold">No visits scheduled for this month</h3>
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-green-600" /> Recent Visits</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : recentVisits && recentVisits.length > 0 ? (
                    <div className="space-y-2">
                        {recentVisits.map(visit => {
                             const householdName = findHouseholdName(visit.householdId);
                             return (
                                <div key={visit.id} className="border p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <p className="font-semibold">{householdName || 'Unknown Family'}</p>
                                            <Badge variant="secondary">{visit.visitType}</Badge>
                                            <p className="text-sm text-muted-foreground">by {visit.visitedBy}</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{new Date(visit.visitDate).toLocaleDateString()}</p>
                                    </div>
                                    {visit.notes && <p className="text-sm text-muted-foreground mt-2 italic">"{visit.notes}"</p>}
                                </div>
                             )
                        })}
                    </div>
                ) : (
                    <p className="text-center py-8 text-muted-foreground">No recent visits have been logged.</p>
                )}
            </CardContent>
        </Card>

      </main>
    </div>
  );
}
