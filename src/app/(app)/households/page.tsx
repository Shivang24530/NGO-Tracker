
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
import { MoreHorizontal, Pen, Trash2, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Household } from '@/lib/types';
import { doc, getDocs, collection, writeBatch, query } from 'firebase/firestore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function AllHouseholdsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const householdsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'households')) : null),
    [firestore]
  );
  
  const { data: households, isLoading } = useCollection<Household>(householdsQuery);

  const finalIsLoading = isUserLoading || isLoading;

  const handleDelete = async (householdId: string, familyName: string) => {
    if (!firestore) return;

    const householdDocRef = doc(firestore, 'households', householdId);

    const batch = writeBatch(firestore);

    // This is a simplified deletion. In a real app with many sub-collections,
    // you'd need a Cloud Function for recursive deletion to avoid leaving orphaned data.
    const childrenSnapshot = await getDocs(collection(householdDocRef, 'children'));
    childrenSnapshot.forEach(doc => batch.delete(doc.ref));

    const visitsSnapshot = await getDocs(collection(householdDocRef, 'followUpVisits'));
    visitsSnapshot.forEach(doc => batch.delete(doc.ref));

    // Delete the household document itself
    batch.delete(householdDocRef);

    batch.commit()
      .then(() => {
        toast({
            title: 'Family Deleted',
            description: `The ${familyName} family and all associated data have been removed.`,
        });
        router.refresh();
      })
      .catch((error) => {
        console.error("Error deleting household:", error);
        // Create and emit the detailed permission error
        const permissionError = new FirestorePermissionError({
            path: householdDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);

        // Also show a generic toast to the user
        toast({
            variant: "destructive",
            title: 'Deletion Failed',
            description: 'There was an error deleting the family data. Check the console for details.',
        });
      });
  };


  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="All Families" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Family Directory</CardTitle>
            <CardDescription>
              A list of all families registered in the system.
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
                      Loading family information...
                    </TableCell>
                  </TableRow>
                )}
                {!finalIsLoading && households && households.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No families registered yet.
                    </TableCell>
                  </TableRow>
                )}
                {households && households.map((household) => (
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
                       <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/households/${household.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visit Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/households/${household.id}/edit`}>
                                  <Pen className="mr-2 h-4 w-4" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                               <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                           <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the
                                  <span className="font-semibold"> {household.familyName} </span> 
                                  family and all associated data, including children and follow-up visits.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(household.id, household.familyName)} className="bg-destructive hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
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
