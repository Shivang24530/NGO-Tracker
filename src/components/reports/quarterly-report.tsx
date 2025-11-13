'use client';
import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Clock,
  FileDown,
  Loader2,
  Calendar,
  PenSquare,
} from 'lucide-react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Household, FollowUpVisit, Child } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';

const quarters = [
  { id: 1, name: 'Quarter 1 (Jan - Mar)', status: 'Completed', completed: 23, total: 23 },
  { id: 2, name: 'Quarter 2 (Apr - Jun)', status: 'Completed', completed: 23, total: 23 },
  { id: 3, name: 'Quarter 3 (Jul - Sep)', status: 'Completed', completed: 23, total: 23 },
  { id: 4, name: 'Quarter 4 (Oct - Dec)', status: 'Ongoing', completed: 5, total: 23 },
];

export function QuarterlyReport() {
  const [year, setYear] = useState('2025');
  const [isDownloading, setIsDownloading] = useState(false);
  
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const householdQuery = useMemoFirebase(
    () =>
      user?.uid
        ? query(collection(firestore, 'households'), where('id', '==', user.uid))
        : null,
    [firestore, user]
  );
  const { data: households, isLoading: householdsLoading } =
    useCollection<Household>(householdQuery);
  
  const childrenQuery = useMemoFirebase(
    () =>
      user?.uid
        ? query(collection(firestore, 'households', user.uid, 'children'))
        : null,
    [firestore, user]
  );
  const { data: children, isLoading: childrenLoading } = useCollection<Child>(childrenQuery);
  
  const visitsQuery = useMemoFirebase(
    () =>
      user?.uid
        ? query(collection(firestore, 'households', user.uid, 'followUpVisits'))
        : null,
    [firestore, user]
  );
  const { data: visits, isLoading: visitsLoading } = useCollection<FollowUpVisit>(visitsQuery);

  const isLoading = isUserLoading || householdsLoading || childrenLoading || visitsLoading;

  const getChildrenCount = (householdId: string) => {
    return children?.filter(c => c.householdId === householdId).length ?? 0;
  }

  const handleDownload = (quarterId: number) => {
    setIsDownloading(true);
    // Simulate CSV generation and download
    setTimeout(() => {
      setIsDownloading(false);
      toast({
        title: 'Report Downloaded',
        description: `Q${quarterId} ${year} report has been successfully generated.`,
      });
    }, 1500);
  };
  
  const reportData = useMemoFirebase(() => {
    if (!households) return [];
    return households.map(h => {
        const visit = visits?.find(v => v.householdId === h.id);
        return {
            ...h,
            childrenCount: getChildrenCount(h.id),
            visitStatus: visit?.status || 'Pending',
        }
    })
  }, [households, visits, children]);


  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Select Year to View</h3>
          </div>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>
      
      <Accordion type="single" collapsible defaultValue="item-4">
        {quarters.map((quarter) => (
          <AccordionItem value={`item-${quarter.id}`} key={quarter.id} className="bg-card border rounded-lg mb-2">
            <AccordionTrigger className="p-4 hover:no-underline">
              <div className="flex items-center gap-4 w-full">
                <div className="flex-1 text-left">
                  <h4 className="font-semibold">{quarter.name}</h4>
                  {quarter.status === 'Completed' ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                      <Clock className="mr-1 h-3 w-3" />
                      Ongoing
                    </Badge>
                  )}
                </div>
                <div className="w-1/4 hidden md:block">
                  <p className="text-sm text-muted-foreground">Completion</p>
                  <Progress value={(quarter.completed / quarter.total) * 100} className="mt-1 h-2" />
                </div>
                <div className="font-semibold text-muted-foreground">
                  {quarter.completed}/{quarter.total}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-0">
                <div className="border-t pt-4">
                    <div className="flex justify-end mb-4">
                        <Button
                            onClick={() => handleDownload(quarter.id)}
                            disabled={isDownloading}
                            className="bg-green-600 text-white hover:bg-green-700"
                        >
                            {isDownloading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                            <FileDown className="mr-2 h-4 w-4" />
                            )}
                            {isDownloading ? 'Generating...' : `Download Q${quarter.id} Report`}
                        </Button>
                    </div>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Family Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Children</TableHead>
                                    <TableHead>Survey Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reportData.map(h => (
                                        <TableRow key={h.id}>
                                            <TableCell className="font-medium">{h.familyName}</TableCell>
                                            <TableCell>{h.locationArea}</TableCell>
                                            <TableCell>{h.childrenCount}</TableCell>
                                            <TableCell>
                                                <Badge variant={h.visitStatus === "Completed" ? "default" : "secondary"} className={h.visitStatus === "Completed" ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                                    {h.visitStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {h.visitStatus === "Completed" ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-600 ml-auto" />
                                                ) : (
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/follow-ups/TBD/conduct`}>
                                                            <PenSquare className="mr-2 h-4 w-4"/>
                                                            Start Survey
                                                        </Link>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
