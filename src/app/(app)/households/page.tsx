'use client';

import { useState } from 'react';
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
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
  errorEmitter,
  FirestorePermissionError,
} from '@/firebase';
import type { Household } from '@/lib/types';
import {
  doc,
  getDocs,
  collection,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
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
import { useLanguage } from '@/contexts/LanguageContext';

export default function AllHouseholdsPage() {
  const { t } = useLanguage();

  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const householdsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(collection(firestore, 'households'), where('ownerId', '==', user.uid))
        : null,
    [firestore, user]
  );

  const { data: households, isLoading } =
    useCollection<Household>(householdsQuery);

  const finalIsLoading = isUserLoading || isLoading;

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (householdId: string, familyName: string) => {
    if (!firestore || deletingId) return;

    setDeletingId(householdId);
    const householdDocRef = doc(firestore, 'households', householdId);

    try {
      const batch = writeBatch(firestore);

      const childrenSnapshot = await getDocs(collection(householdDocRef, 'children'));
      childrenSnapshot.forEach((doc) => batch.delete(doc.ref));

      const visitsSnapshot = await getDocs(collection(householdDocRef, 'followUpVisits'));
      visitsSnapshot.forEach((doc) => batch.delete(doc.ref));

      batch.delete(householdDocRef);

      await batch.commit();

      toast({
        title: t("family_deleted"),
        description: `${familyName} ${t("family_deleted_desc")}`,
      });
      // router.refresh(); // Removed to prevent offline hanging. useCollection updates automatically.

    } catch (error) {
      console.error('Error deleting household:', error);

      const permissionError = new FirestorePermissionError({
        path: householdDocRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);

      toast({
        variant: 'destructive',
        title: t("deletion_failed"),
        description: t("deletion_failed_desc"),
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title={t("all_families")} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("family_directory")}</CardTitle>
            <CardDescription>
              {t("family_directory_desc")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("family_name")}</TableHead>
                  <TableHead>{t("location_area")}</TableHead>
                  <TableHead>{t("primary_contact")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {finalIsLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {t("loading_families")}
                    </TableCell>
                  </TableRow>
                )}

                {!finalIsLoading && households && households.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {t("no_families")}
                    </TableCell>
                  </TableRow>
                )}

                {households &&
                  households.map((household) => (
                    <TableRow key={household.id}>
                      <TableCell className="font-medium">
                        {household.familyName}
                      </TableCell>
                      <TableCell>{household.locationArea}</TableCell>
                      <TableCell>{household.primaryContact}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            household.status === 'Active'
                              ? 'default'
                              : 'secondary'
                          }
                          className={
                            household.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : ''
                          }
                        >
                          {household.status === "Active"
                            ? t("active")
                            : t("inactive")}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">{t("more_actions")}</span>
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/households/${household.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {t("view_details")}
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem asChild>
                                <Link href={`/households/${household.id}/edit`}>
                                  <Pen className="mr-2 h-4 w-4" />
                                  {t("edit")}
                                </Link>
                              </DropdownMenuItem>

                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t("delete")}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("delete_confirm_title")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("delete_confirm_desc")}
                                <span className="font-semibold">
                                  {" "}{household.familyName}{" "}
                                </span>
                                {t("delete_confirm_desc_2")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDelete(household.id, household.familyName)
                                }
                                className="bg-destructive hover:bg-destructive/90"
                                disabled={deletingId === household.id}
                              >
                                {deletingId === household.id ? "Deleting..." : t("delete")}
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

