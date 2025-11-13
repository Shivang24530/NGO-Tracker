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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Household } from '@/lib/types';
import { collection, query, where, orderBy, limit, startAfter, endBefore, limitToLast, DocumentSnapshot } from 'firebase/firestore';
import { useState } from 'react';

export default function AllHouseholdsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [firstVisible, setFirstVisible] = useState<DocumentSnapshot | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const getHouseholdsQuery = (direction: 'next' | 'prev' | 'first') => {
    if (!user?.uid) return null;
    const baseQuery = collection(firestore, 'households');
    const constraints = [where('id', '==', user.uid), orderBy('familyName')];

    if (direction === 'next' && lastVisible) {
      return query(baseQuery, ...constraints, startAfter(lastVisible), limit(pageSize));
    }
    if (direction === 'prev' && firstVisible) {
      return query(baseQuery, ...constraints, endBefore(firstVisible), limitToLast(pageSize));
    }
    return query(baseQuery, ...constraints, limit(pageSize));
  };

  const [currentQuery, setCurrentQuery] = useState(() => getHouseholdsQuery('first'));
  
  const { data: households, isLoading } = useCollection<Household>(useMemoFirebase(() => currentQuery, [currentQuery]));

  const handleNext = () => {
    if (households && households.length > 0) {
      const lastDoc = households[households.length - 1] as any;
       // This is a bit of a hack because our useCollection doesn't give us snapshots back
      setLastVisible({ id: lastDoc.id, data: () => lastDoc, exists: () => true } as DocumentSnapshot);
      setCurrentQuery(getHouseholdsQuery('next'));
      setPage(page + 1);
    }
  };

  const handlePrevious = () => {
    if (households && households.length > 0) {
      const firstDoc = households[0] as any;
       setFirstVisible({ id: firstDoc.id, data: () => firstDoc, exists: () => true } as DocumentSnapshot);
      setCurrentQuery(getHouseholdsQuery('prev'));
      setPage(page - 1);
    }
  };
  
    // This effect is a workaround to get the document snapshots for pagination
  // because useCollection doesn't expose them. This is not ideal.
  const { data: snapshotHouseholds } = useCollection<{id: string, familyName: string}>(useMemoFirebase(() => currentQuery, [currentQuery]));
  
  const updateSnapshots = () => {
      if (snapshotHouseholds && snapshotHouseholds.length > 0) {
          setFirstVisible(snapshotHouseholds[0] as any);
          setLastVisible(snapshotHouseholds[snapshotHouseholds.length - 1] as any);
      } else {
          setFirstVisible(null);
          setLastVisible(null);
      }
  };

  // We can't call set in render, so we use an effect
  useState(() => {
    if(snapshotHouseholds) updateSnapshots();
  });


  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="All Families" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Family Directory</CardTitle>
            <CardDescription>
              A complete list of all families registered in the program.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family Name</TableHead>
                  <TableHead>Location Area</TableHead>
                  <TableHead>Primary Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading families...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && households?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No families registered yet.
                    </TableCell>
                  </TableRow>
                )}
                {households?.map((household) => (
                  <TableRow key={household.id}>
                    <TableCell className="font-medium">{household.familyName}</TableCell>
                    <TableCell>{household.locationArea}</TableCell>
                    <TableCell>{household.primaryContact}</TableCell>
                    <TableCell>
                      <Badge
                        variant={household.status === 'Active' ? 'default' : 'secondary'}
                        className={household.status === 'Active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {household.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button asChild variant="ghost" size="sm">
                          <Link href={`/households/${household.id}`}>
                            View Details <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={handlePrevious} disabled={page <= 1 || isLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button onClick={handleNext} disabled={!households || households.length < pageSize || isLoading}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
