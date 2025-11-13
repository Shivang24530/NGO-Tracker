
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
import { collection, query, orderBy, limit, startAfter, endBefore, limitToLast, getDocs, Query, DocumentData } from 'firebase/firestore';
import { useState, useEffect } from 'react';

export default function AllHouseholdsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [lastVisible, setLastVisible] = useState<any | null>(null);
  const [firstVisible, setFirstVisible] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);

  const pageSize = 20;

  const buildQuery = (direction?: 'next' | 'prev'): Query<DocumentData> | null => {
    if (!user) return null;
    
    const baseCollection = collection(firestore, 'households');
    let q = query(baseCollection, orderBy('familyName'), limit(pageSize));

    if (direction === 'next' && lastVisible) {
      q = query(baseCollection, orderBy('familyName'), startAfter(lastVisible), limit(pageSize));
    } else if (direction === 'prev' && firstVisible) {
      q = query(baseCollection, orderBy('familyName'), endBefore(firstVisible), limitToLast(pageSize));
    }

    return q;
  };
  
  const fetchHouseholds = async (direction?: 'next' | 'prev') => {
    if (!user) return;
    const paginating = direction === 'next' || direction === 'prev';
    if(paginating) setIsPaginating(true);
    else setIsLoading(true);

    const q = buildQuery(direction);
    if (!q) {
       if(paginating) setIsPaginating(false);
       else setIsLoading(false);
      return;
    };

    try {
      const documentSnapshots = await getDocs(q);
      const fetchedHouseholds = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Household));
      
      // We only want the household that matches the user's ID
      const userHousehold = fetchedHouseholds.filter(h => h.id === user.uid);
      
      setHouseholds(userHousehold);
      setHasNextPage(fetchedHouseholds.length === pageSize);

      if (documentSnapshots.docs.length > 0) {
        setFirstVisible(documentSnapshots.docs[0]);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      }
    } catch (error) {
      console.error("Error fetching households:", error);
    } finally {
      if(paginating) setIsPaginating(false);
      else setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHouseholds();
    } else if (!isUserLoading) {
      setIsLoading(false);
    }
  }, [user, isUserLoading]);

  const handleNext = () => {
    if (hasNextPage) {
      setPage(page + 1);
      fetchHouseholds('next');
    }
  };

  const handlePrevious = () => {
    if (page > 1) {
      setPage(page - 1);
      fetchHouseholds('prev');
    }
  };

  const finalIsLoading = isLoading || isPaginating;

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
                {finalIsLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading families...
                    </TableCell>
                  </TableRow>
                )}
                {!finalIsLoading && households?.length === 0 && (
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
            <Button onClick={handlePrevious} disabled={page <= 1 || finalIsLoading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button onClick={handleNext} disabled={!hasNextPage || finalIsLoading}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
