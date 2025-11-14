
'use client';

import { PageHeader } from '@/components/common/page-header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ProgressAnalysis } from '@/components/genai/progress-analysis';
import { ArrowUp, ArrowDown, Loader2, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, doc, query, collectionGroup, getDocs, where } from 'firebase/firestore';
import type { Child, Household } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';

export default function ProgressTrackingPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [childrenWithStatus, setChildrenWithStatus] = useState<(Child & { status: 'Improved' | 'Declined' })[]>([]);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);

  const householdsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'households')) : null),
    [firestore]
  );
  const { data: households, isLoading: householdsLoading } = useCollection<Household>(householdsQuery);

  useEffect(() => {
    if (households === null) {
      setChildrenLoading(true);
      return;
    }
    
    if (households.length === 0) {
        setAllChildren([]);
        setChildrenLoading(false);
        return;
    }

    const fetchAllChildren = async () => {
      if (!firestore) return;
      setChildrenLoading(true);
      const childrenPromises = households.map(h => 
        getDocs(collection(firestore, 'households', h.id, 'children'))
      );
      try {
        const childrenSnapshots = await Promise.all(childrenPromises);
        const childrenData = childrenSnapshots.flatMap(snap => 
          snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Child))
        );
        setAllChildren(childrenData);
      } catch (error) {
        console.error("Error fetching children data:", error);
        setAllChildren([]);
      } finally {
        setChildrenLoading(false);
      }
    };
    
    fetchAllChildren();
  }, [firestore, households]);
  
  useEffect(() => {
    if (allChildren) {
      // This is placeholder logic to simulate progress status
      const childrenWithRandomStatus = allChildren.map(child => ({
        ...child,
        status: Math.random() > 0.5 ? 'Improved' : 'Declined' as 'Improved' | 'Declined',
      }));
      setChildrenWithStatus(childrenWithRandomStatus);
    }
  }, [allChildren]); 


  const isLoading = isUserLoading || householdsLoading || childrenLoading;

  const totalChildren = allChildren.length ?? 0;
  const improvedCount = childrenWithStatus.filter(c => c.status === 'Improved').length;
  const declinedCount = childrenWithStatus.filter(c => c.status === 'Declined').length;
  
  const findHouseholdName = (householdId: string) => {
    return households?.find(h => h.id === householdId)?.familyName || '...';
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Progress Tracking" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Total Children</CardDescription>
                    <CardTitle className="text-4xl text-blue-600">{isLoading ? '...' : totalChildren}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground flex items-center">
                        <Users className="h-4 w-4 mr-1 text-blue-600" />
                        All registered children
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Improved (Back to School)</CardDescription>
                    <CardTitle className="text-4xl text-primary">{isLoading ? '...' : improvedCount}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground flex items-center">
                        <ArrowUp className="h-4 w-4 mr-1 text-primary" />
                        +5% from last quarter
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Declined (Dropped Out)</CardDescription>
                    <CardTitle className="text-4xl text-destructive">{isLoading ? '...' : declinedCount}</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="text-xs text-muted-foreground flex items-center">
                        <ArrowDown className="h-4 w-4 mr-1 text-destructive" />
                        +2% from last quarter
                    </div>
                </CardContent>
            </Card>
        </div>

        <ProgressAnalysis />

        <Card>
          <CardHeader>
            <CardTitle>Child List</CardTitle>
            <CardDescription>
              View the progress history of all registered children.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child Name</TableHead>
                  <TableHead>Family</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Current Class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : childrenWithStatus.length > 0 ? (
                  childrenWithStatus.map((child) => (
                  <TableRow key={child.id}>
                    <TableCell className="font-medium">{child.name}</TableCell>
                    <TableCell>{findHouseholdName(child.householdId)}</TableCell>
                    <TableCell>{child.age}</TableCell>
                    <TableCell>
                      <Badge
                        variant={child.isStudying ? 'default' : 'destructive'}
                        className={child.isStudying ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                      >
                        {child.isStudying ? 'Studying' : 'Not Studying'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {child.isStudying ? child.currentClass : 'N/A'}
                    </TableCell>
                  </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No children found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
