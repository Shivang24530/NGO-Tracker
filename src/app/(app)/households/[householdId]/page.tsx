'use client';
import { useParams } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Household, Child, FollowUpVisit } from '@/lib/types';
import { doc, collection } from 'firebase/firestore';
import { PageHeader } from '@/components/common/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Loader2, Home, Users, Phone, MapPin, Calendar, Briefcase, School } from 'lucide-react';

export default function HouseholdDetailsPage() {
  const params = useParams();
  const householdId = params.householdId as string;
  const firestore = useFirestore();

  const householdRef = useMemoFirebase(
    () => (householdId ? doc(firestore, 'households', householdId) : null),
    [firestore, householdId]
  );
  const { data: household, isLoading: householdLoading } = useDoc<Household>(householdRef);

  const childrenQuery = useMemoFirebase(
    () => (householdId ? collection(firestore, 'households', householdId, 'children') : null),
    [firestore, householdId]
  );
  const { data: children, isLoading: childrenLoading } = useCollection<Child>(childrenQuery);
  
  const visitsQuery = useMemoFirebase(
    () => (householdId ? collection(firestore, 'households', householdId, 'followUpVisits') : null),
    [firestore, householdId]
  );
  const { data: visits, isLoading: visitsLoading } = useCollection<FollowUpVisit>(visitsQuery);

  const isLoading = householdLoading || childrenLoading || visitsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <PageHeader title="Household Not Found" />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
            <p>The requested household could not be found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title={household.familyName} />
      <main className="flex-1 space-y-8 p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-primary" /> Household Information</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" /> Family Name</p>
              <p>{household.familyName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Address</p>
              <p>{household.fullAddress}</p>
            </div>
             <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> Contact</p>
              <p>{household.primaryContact}</p>
            </div>
             <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge>{household.status}</Badge>
            </div>
             <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Next Follow-up</p>
              <p>{new Date(household.nextFollowupDue).toLocaleDateString()}</p>
            </div>
            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Family Photo</p>
                    <Image src={household.familyPhotoUrl} alt="Family Photo" width={400} height={300} className="rounded-lg border aspect-video object-cover" />
                 </div>
                 <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">House Photo</p>
                    <Image src={household.housePhotoUrl} alt="House Photo" width={400} height={300} className="rounded-lg border aspect-video object-cover" />
                 </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Children</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>School</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {children?.map(child => (
                        <TableRow key={child.id}>
                            <TableCell>{child.name}</TableCell>
                            <TableCell>{child.age}</TableCell>
                            <TableCell>{child.gender}</TableCell>
                            <TableCell>
                                <Badge variant={child.isStudying ? 'default' : 'secondary'} className={child.isStudying ? 'bg-green-100 text-green-800' : ''}>
                                    {child.isStudying ? 'Studying' : 'Not Studying'}
                                </Badge>
                            </TableCell>
                            <TableCell>{child.isStudying ? child.schoolName : 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                    {!children?.length && <TableRow><TableCell colSpan={5} className="text-center">No children registered.</TableCell></TableRow>}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Follow-Up Visits</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Visit Date</TableHead>
                        <TableHead>Visit Type</TableHead>
                        <TableHead>Conducted By</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {visits?.map(visit => (
                        <TableRow key={visit.id}>
                            <TableCell>{new Date(visit.visitDate).toLocaleDateString()}</TableCell>
                            <TableCell>{visit.visitType}</TableCell>
                            <TableCell>{visit.visitedBy}</TableCell>
                            <TableCell>
                                <Badge variant={visit.status === 'Completed' ? 'default' : 'secondary'} className={visit.status === 'Completed' ? 'bg-green-100 text-green-800' : ''}>
                                    {visit.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                    {!visits?.length && <TableRow><TableCell colSpan={4} className="text-center">No visits recorded.</TableCell></TableRow>}
                </TableBody>
            </Table>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}