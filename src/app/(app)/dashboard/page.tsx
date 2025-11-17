
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
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Household } from '@/lib/types';

type DashboardStats = {
  totalFamilies: number;
  totalChildren: number;
  childrenStudying: number;
  childrenNotStudying: number;
  visitsThisQuarter: number;
  updatedAt: any; // Firestore Timestamp
};

export default function Dashboard() {
  const firestore = useFirestore();
  const { user } = useUser();

  const statsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'stats', 'dashboard') : null),
    [firestore]
  );
  const { data: stats, isLoading: statsLoading } = useDoc<DashboardStats>(statsDocRef);

  const recentHouseholdsQuery = useMemoFirebase(
    () => (firestore && user ? query(
        collection(firestore, 'households'), 
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
    ) : null),
    [firestore, user]
  );
  const { data: recentHouseholds, isLoading: householdsLoading } = useCollection<Household>(recentHouseholdsQuery);

  const isLoading = statsLoading || householdsLoading;

  const totalFamilies = stats?.totalFamilies ?? 0;
  const totalChildren = stats?.totalChildren ?? 0;
  const childrenStudying = stats?.childrenStudying ?? 0;
  const childrenNotStudying = stats?.childrenNotStudying ?? 0;
  const visitsThisQuarter = stats?.visitsThisQuarter ?? 0;

  const statCards = [
    { 
      title: 'Total Families', 
      value: totalFamilies, 
      icon: Users, 
      color: 'bg-orange-500', 
      progress: 100 
    },
    { 
      title: 'Total Children', 
      value: totalChildren, 
      icon: Users, 
      color: 'bg-pink-500', 
      progress: 100 
    },
    { 
      title: 'Children Studying', 
      value: childrenStudying, 
      icon: TrendingUp, 
      color: 'bg-green-500', 
      progress: totalChildren > 0 ? (childrenStudying / totalChildren) * 100 : 0 
    },
    { 
      title: 'Families Visited This Quarter', 
      value: visitsThisQuarter, 
      icon: Clock, 
      color: 'bg-purple-500', 
      progress: totalFamilies > 0 ? (visitsThisQuarter / totalFamilies) * 100 : 0 
    },
  ];
  
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
          {isLoading ? (
             <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                {statCards.map((stat, index) => (
                  <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                        <div className={`flex items-center justify-center h-8 w-8 rounded-lg bg-primary/20`}>
                          <stat.icon className={`h-5 w-5 text-primary`} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stat.value}</div>
                      <Progress value={stat.progress} className="mt-2 h-2" />
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
                      {recentHouseholds && recentHouseholds.length > 0 ? (
                        recentHouseholds.map((h, index) => (
                          <div key={h.id} className={`flex items-center gap-4 p-4 ${index < recentHouseholds.length -1 ? 'border-b' : ''}`}>
                              <div className="grid gap-1">
                                  <p className="text-sm font-medium leading-none">{h.familyName}</p>
                                  <p className="text-sm text-muted-foreground">@ {h.locationArea}</p>
                              </div>
                              <div className="ml-auto font-medium text-sm text-muted-foreground">Registered: {new Date(h.createdAt).toLocaleDateString()}</div>
                          </div>
                      ))
                      ) : (
                        <p className="p-4 text-center text-muted-foreground">No recent registrations found.</p>
                      )}
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
                        <p className="text-2xl font-bold text-green-900">{childrenStudying}</p>
                      </div>
                      <TrendingUp className="h-6 w-6 text-green-700" />
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
                       <div>
                        <p className="text-sm text-yellow-800">Not Studying</p>
                        <p className="text-2xl font-bold text-yellow-900">{childrenNotStudying}</p>
                      </div>
                      <AlertTriangle className="h-6 w-6 text-yellow-700" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
      </main>
    </div>
  );
}
