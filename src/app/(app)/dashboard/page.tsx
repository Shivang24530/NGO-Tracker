'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, UserPlus, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Household, Child, FollowUpVisit } from '@/lib/types';
import { collection, query, where, limit } from 'firebase/firestore';

export default function Dashboard() {
  const firestore = useFirestore();
  const { user } = useUser();

  const householdsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'households')) : null,
    [firestore, user]
  );
  const { data: households, isLoading: householdsLoading } = useCollection<Household>(householdsQuery);

  const childrenQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'households', user.uid, 'children')) : null,
    [firestore, user]
  );
  const { data: children, isLoading: childrenLoading } = useCollection<Child>(childrenQuery);
  
  const visitsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'households', user.uid, 'followUpVisits')) : null,
    [firestore, user]
  );
  const { data: followUpVisits, isLoading: visitsLoading } = useCollection<FollowUpVisit>(visitsQuery);

  const recentRegistrationsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'households'), limit(5)) : null,
    [firestore, user]
  );
  const { data: recentRegistrations, isLoading: recentRegistrationsLoading } = useCollection<Household>(recentRegistrationsQuery);


  const totalFamilies = households?.length ?? 0;
  const totalChildren = children?.length ?? 0;
  const childrenStudying = children?.filter((c) => c.isStudying).length ?? 0;
  const childrenNotStudying = totalChildren - childrenStudying;
  const visitsThisQuarter = followUpVisits?.filter(
    (v) => new Date(v.visitDate) > new Date(new Date().setMonth(new Date().getMonth() - 3))
  ).length ?? 0;

  const stats = [
      { title: 'Total Families', value: totalFamilies, icon: Users, color: 'bg-orange-500', progress: 70 },
      { title: 'Total Children', value: totalChildren, icon: Users, color: 'bg-pink-500', progress: 50 },
      { title: 'Children Studying', value: childrenStudying, icon: TrendingUp, color: 'bg-green-500', progress: 80 },
      { title: 'Visits This Quarter', value: visitsThisQuarter, icon: Clock, color: 'bg-purple-500', progress: 60 },
  ];

  const isLoading = householdsLoading || childrenLoading || visitsLoading || recentRegistrationsLoading;

  return (
    <div className="flex min-h-screen w-full flex-col">
       <PageHeader title="Welcome Back! 👋">
         <p className="text-sm text-muted-foreground hidden md:block">
            Track and manage family registrations in your community
          </p>
          <div className="ml-auto">
            <Button asChild>
                <Link href="/households/register">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register New Family
                </Link>
            </Button>
          </div>
       </PageHeader>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${stat.color}/20`}>
                    <stat.icon className={`h-5 w-5 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{isLoading ? '...' : stat.value}</div>
                <Progress value={isLoading ? 0 : stat.progress} className="mt-2 h-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2 shadow-sm">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Recent Registrations</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="grid gap-0">
                {recentRegistrations?.map((h, index) => (
                    <div key={h.id} className={`flex items-center gap-4 p-4 ${index < 4 ? 'border-b' : ''}`}>
                        <div className="grid gap-1">
                            <p className="text-sm font-medium leading-none">{h.familyName}</p>
                            <p className="text-sm text-muted-foreground">@ {h.locationArea}</p>
                        </div>
                        <div className="ml-auto font-medium text-sm text-muted-foreground">{new Date(h.nextFollowupDue).toLocaleDateString()}</div>
                    </div>
                ))}
                {isLoading && <p className="p-4 text-center text-muted-foreground">Loading...</p>}
                {!isLoading && recentRegistrations?.length === 0 && <p className="p-4 text-center text-muted-foreground">No recent registrations found.</p>}
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Children Overview</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-800">Currently Studying</p>
                  <p className="text-2xl font-bold text-green-900">{isLoading ? '...' : childrenStudying}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-700" />
              </div>
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
                 <div>
                  <p className="text-sm text-yellow-800">Not Studying</p>
                  <p className="text-2xl font-bold text-yellow-900">{isLoading ? '...' : childrenNotStudying}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-yellow-700" />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
