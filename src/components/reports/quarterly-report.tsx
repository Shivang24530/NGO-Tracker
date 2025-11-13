
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  XCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getQuarter, format, isPast, getYear } from 'date-fns';
import { useFollowUpLogic } from '@/hooks/use-follow-up-logic';
import { getDocs, collection, query, where, Firestore } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { ChildProgressUpdate } from '@/lib/types';


function QuarterlyReportContent({ firestore }: { firestore: Firestore }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [isDownloading, setIsDownloading] = useState(false);
  const router = useRouter();

  const { quarters, households, children, isLoading } = useFollowUpLogic(year);
  
  const handleDownload = async (quarterId: number) => {
    if (!households || !children || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Cannot Download',
        description: 'No data available to generate the report.',
      });
      return;
    }
  
    setIsDownloading(true);
  
    try {
      const quarter = quarters.find((q) => q.id === quarterId);
       if (!quarter || quarter.completed === 0) {
        toast({
          variant: 'destructive',
          title: 'Report Not Ready',
          description: 'No surveys have been completed for this quarter.',
        });
        return;
      }
  
      const household = households[0]; // Assuming one household for this simplified view.
      if (!household) {
        toast({ variant: 'destructive', title: 'Household not found' });
        return;
      }
      
      const visit = quarter.visits.find(v => v.householdId === household.id);
      if (!visit) {
         toast({ variant: 'destructive', title: 'Visit not found' });
         return;
      }
  
      // Fetch all child progress updates for this specific visit
      const progressUpdatesByChild: { [childId: string]: ChildProgressUpdate } = {};
      
      for (const child of children) {
          const progressUpdatesRef = collection(firestore, `households/${household.id}/children/${child.id}/childProgressUpdates`);
          const q = query(progressUpdatesRef, where('visit_id', '==', visit.id));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
              // Assuming one progress update per child per visit
              progressUpdatesByChild[child.id] = querySnapshot.docs[0].data() as ChildProgressUpdate;
          }
      }
      
      const headers = [
        'Family Name', 'Location', 'Child Name', 'Age', 'Gender',
        'Studying?', 'Reason Not Studying', 'Working?', 'Work Details',
        'Study Challenges', 'Visit Date', 'Visited By',
      ];
  
      const rows = children.map((child) => {
        const progress = progressUpdatesByChild[child.id];
        if (!progress) return null; // Only include children with progress updates for this visit
        
        return [
          household.familyName,
          household.locationArea,
          child.name,
          child.age,
          child.gender,
          progress ? (progress.is_studying ? 'Yes' : 'No') : 'N/A',
          progress && !progress.is_studying ? progress.not_studying_reason || '' : '',
          progress ? (progress.is_working ? 'Yes' : 'No') : 'N/A',
          progress && progress.is_working ? progress.work_details || '' : '',
          progress ? progress.studying_challenges || '' : '',
          visit ? format(new Date(visit.visitDate), 'yyyy-MM-dd') : '',
          visit ? visit.visitedBy : '',
        ].map(value => `"${String(value ?? '').replace(/"/g, '""')}"`);
      }).filter(Boolean) as string[][];
  
      if (rows.length === 0) {
          toast({ title: 'No completed surveys to report for this quarter.'});
          return;
      }

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Q${quarterId}_${year}_Report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  
      toast({
        title: 'Report Downloaded',
        description: `Q${quarterId} ${year} report has been successfully generated.`,
      });
  
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'An error occurred while generating the report.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const now = new Date();
  const currentQuarterNum = getQuarter(now);
  const currentYear = getYear(now);

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Select Year to View</h3>
          </div>
          <Select
            value={year.toString()}
            onValueChange={(val) => setYear(parseInt(val))}
          >
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

      <Accordion
        type="single"
        collapsible
        defaultValue={`item-${getQuarter(new Date())}`}
      >
        {quarters.map((quarter) => {
          const completionPercentage =
            isLoading || !households
              ? 0
              : (quarter.completed / quarter.total) * 100;

          const isPastQuarter = year < currentYear || (year === currentYear && quarter.id < currentQuarterNum);
          
          const household = households ? households[0] : null;
          const visit = household ? quarter.visits.find(v => v.householdId === household.id) : null;
          const visitStatus = visit?.status || 'Pending';
          const isSurveyActionable = visitStatus !== 'Completed' && !isPastQuarter;


          return (
            <AccordionItem
              value={`item-${quarter.id}`}
              key={quarter.id}
              className="bg-card border rounded-lg mb-2"
            >
              <AccordionTrigger className="p-4 hover:no-underline">
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold">{quarter.name}</h4>
                    {quarter.status === 'Completed' ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 border-green-200"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Completed
                      </Badge>
                    ) : isPastQuarter && quarter.status !== 'Completed' ? (
                       <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-800 border-red-200"
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Incomplete
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-orange-100 text-orange-800 border-orange-200"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  <div className="w-1/4 hidden md:block">
                    <p className="text-sm text-muted-foreground">Completion</p>
                    <Progress
                      value={completionPercentage}
                      className="mt-1 h-2"
                    />
                  </div>
                  <div className="font-semibold text-muted-foreground">
                    {isLoading ? '...' : `${quarter.completed}/${quarter.total}`}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <div className="border-t pt-4">
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={() => handleDownload(quarter.id)}
                      disabled={isDownloading || !households || quarter.completed === 0}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {isDownloading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="mr-2 h-4 w-4" />
                      )}
                      {isDownloading
                        ? 'Generating...'
                        : `Download Q${quarter.id} Report`}
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
                        ) : households && households.length > 0 ? (
                          households.map(household => {
                            const visit = quarter.visits.find(v => v.householdId === household.id);
                            const visitStatus = visit?.status || 'Pending';
                            const isActionable = visitStatus !== 'Completed' && !isPastQuarter;
                            const householdChildren = children?.filter(c => c.householdId === household.id) || [];

                            return (
                               <TableRow key={household.id}>
                                <TableCell className="font-medium">
                                  {household.familyName}
                                </TableCell>
                                <TableCell>{household.locationArea}</TableCell>
                                <TableCell>{householdChildren.length}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      visitStatus === 'Completed'
                                        ? 'default'
                                        : 'secondary'
                                    }
                                    className={
                                      visitStatus === 'Completed'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }
                                  >
                                    {visitStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {visitStatus === 'Completed' ? (
                                    <div className="flex items-center justify-end text-green-600">
                                      <CheckCircle2 className="h-5 w-5 ml-auto" />
                                    </div>
                                  ) : isActionable && visit ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          router.push(`/households/${household.id}/follow-ups/${visit.id}/conduct`);
                                        }}
                                      >
                                        <PenSquare className="mr-2 h-4 w-4" />
                                        Start Survey
                                      </Button>
                                  ) : (
                                    <span className="text-sm text-muted-foreground italic">
                                        { isPastQuarter && visitStatus !== 'Completed' ? 'Survey period ended' : '...'}
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                           <TableRow>
                             <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No families registered in the system.</TableCell>
                           </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

export function QuarterlyReport() {
    const firestore = useFirestore();

    if (!firestore) {
        return (
            <div className="flex w-full items-center justify-center p-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return <QuarterlyReportContent firestore={firestore} />;
}
