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
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Household } from '@/lib/types';
import { collection, query } from 'firebase/firestore';

export default function AllHouseholdsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const householdsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'households')) : null,
    [firestore, user]
  );
  const { data: households, isLoading } = useCollection<Household>(householdsQuery);

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
                          <Link href="#">
                            View Details <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
