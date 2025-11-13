
'use client';
import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  isPast,
  isSameDay,
} from 'date-fns';
import {
  Clock,
  CalendarCheck,
  AlertCircle,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useFollowUpLogic } from '@/hooks/use-follow-up-logic';

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
  const { household, visits, isLoading } = useFollowUpLogic(new Date().getFullYear());

  const now = new Date();
  
  const overdue =
    visits?.filter(
      (v) =>
        v.status === 'Pending' &&
        isPast(new Date(v.visitDate)) &&
        !isSameDay(new Date(v.visitDate), now)
    ) ?? [];

  const upcoming =
    visits?.filter(
      (v) => v.status === 'Pending' && !isPast(new Date(v.visitDate))
    ) ?? [];
  
  const completed =
    visits?.filter((v) => v.status === 'Completed') ?? [];

  const recentVisits = 
    completed.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()).slice(0, 5) ?? [];

  const totalFamilies = household ? 1 : 0;
  const householdName = household?.familyName;

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
            <StatCard title="Upcoming Visits" value={upcoming.length} icon={Clock} color="orange" isLoading={isLoading} />
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
                            return (
                                <Link href={`/households/${visit.householdId}/follow-ups/${visit.id}/conduct`} key={visit.id} className="block border p-4 rounded-lg hover:bg-secondary">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{householdName}</p>
                                        <p className="text-sm text-muted-foreground">{new Date(visit.visitDate).toLocaleDateString()}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{household?.locationArea}</p>
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
                    <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-orange-500" /> Upcoming Visits ({upcoming.length})</CardTitle>
                </CardHeader>
                <CardContent>
                {isLoading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : upcoming.length > 0 ? (
                    <div className="space-y-4">
                        {upcoming.map((visit) => {
                             return (
                                <Link href={`/households/${visit.householdId}/follow-ups/${visit.id}/conduct`} key={visit.id} className="block border p-4 rounded-lg hover:bg-secondary">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold">{householdName}</p>
                                        <p className="text-sm text-muted-foreground">{new Date(visit.visitDate).toLocaleDateString()}</p>
                                    </div>
                                     <p className="text-sm text-muted-foreground">{household?.locationArea}</p>
                                </Link>
                             )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground space-y-2">
                        <CalendarCheck className="mx-auto h-12 w-12" />
                        <h3 className="font-semibold">No visits scheduled</h3>
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
                             return (
                                <div key={visit.id} className="border p-4 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <p className="font-semibold">{householdName || 'Unknown Family'}</p>
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
