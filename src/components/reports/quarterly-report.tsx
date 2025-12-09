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
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  HelpCircle,
  Search,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getQuarter, format, isPast, getYear } from 'date-fns';
import { useFollowUpLogic } from '@/hooks/use-follow-up-logic';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { ChildProgressUpdate } from '@/lib/types';
import { calculateAge } from '@/lib/utils';

function QuarterlyReportContent() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [isDownloading, setIsDownloading] = useState(false);

  // 🔍 SEARCH STATE PER QUARTER
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});

  const router = useRouter();
  const firestore = useFirestore();

  const { quarters, households, children, isLoading } = useFollowUpLogic(year);

  const handleDownload = async (quarterId: number) => {
    if (!households || !children || !firestore) {
      toast({ variant: 'destructive', title: 'Cannot Download' });
      return;
    }
    setIsDownloading(true);
    try {
      const quarter = quarters.find((q) => q.id === quarterId);
      if (!quarter || quarter.completed === 0) {
        toast({ variant: 'destructive', title: 'Report Not Ready' });
        return;
      }

      const completedVisits = quarter.visits.filter((v) => v.status === 'Completed');
      if (completedVisits.length === 0) {
        toast({ title: 'No completed surveys to report.' });
        setIsDownloading(false);
        return;
      }

      let rows: string[][] = [];
      const headers = [
        'Family Name',
        'Location',
        'Child Name',
        'Age',
        'Gender',
        'Studying?',
        'Current Class',
        'School Name',
        'Reason Not Studying',
        'Working?',
        'Work Details',
        'Study Challenges',
        'Toilet Available?',
        'Water Supply',
        'Electricity?',
        'Annual Income (INR)',
        'Visit Date',
        'Visited By',
        'Visit Notes',
      ];

      for (const visit of completedVisits) {
        const household = households.find((h) => h.id === visit.householdId);
        if (!household) continue;

        const householdChildren = children.filter((c) => c.householdId === household.id);

        const isAnnualVisit = visit.visitType === 'Annual';

        for (const child of householdChildren) {
          const ref = collection(
            firestore,
            `households/${household.id}/children/${child.id}/childProgressUpdates`
          );
          const q = query(ref, where('visitId', '==', visit.id));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            const progress = snapshot.docs[0].data() as ChildProgressUpdate;
            const age = calculateAge(child.dateOfBirth);

            const row = [
              household.familyName,
              household.locationArea,
              child.name,
              age.toString(),
              child.gender,
              progress?.is_studying ? 'Yes' : 'No',
              progress?.is_studying ? child.currentClass || '' : '',
              progress?.is_studying ? child.schoolName || '' : '',
              progress?.is_studying ? '' : progress?.not_studying_reason || '',
              progress?.is_working ? 'Yes' : 'No',
              progress?.is_working ? progress?.work_details || '' : '',
              progress?.studying_challenges || '',
              isAnnualVisit ? (household.toiletAvailable ? 'Yes' : 'No') : 'N/A',
              isAnnualVisit ? household.waterSupply || '' : 'N/A',
              isAnnualVisit ? (household.electricity ? 'Yes' : 'No') : 'N/A',
              isAnnualVisit ? household.annualIncome?.toString() || '0' : 'N/A',
              format(new Date(visit.visitDate), 'yyyy-MM-dd'),
              visit.visitedBy,
              visit.notes || '',
            ].map((v) => `"${v.replace(/"/g, '""')}"`);

            rows.push(row);
          }
        }
      }

      if (rows.length === 0) {
        toast({ title: 'No data to report.' });
        setIsDownloading(false);
        return;
      }

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const fileName = `Q${quarterId}_${year}_Report.csv`;

      // Check if running in Capacitor (mobile app)
      if (typeof window !== 'undefined' && (window as any).Capacitor) {
        try {
          // Dynamic import for Capacitor Filesystem and Share
          const { Filesystem, Directory } = await import('@capacitor/filesystem');
          const { Share } = await import('@capacitor/share');

          // Write file to Cache directory first (no permissions needed)
          const result = await Filesystem.writeFile({
            path: fileName,
            data: csv,
            directory: Directory.Cache,
            encoding: 'utf8',
          });

          // Use Share API to let user save the file
          await Share.share({
            title: 'Save CSV Report',
            text: `Quarterly Report ${fileName}`,
            url: result.uri,
            dialogTitle: 'Save Report'
          });

          toast({
            title: 'Opening Share Dialog',
            description: 'Choose where to save the file'
          });
        } catch (error) {
          console.error('Capacitor download error:', error);
          toast({
            variant: 'destructive',
            title: 'Download Failed',
            description: 'Could not save file on mobile. Please try on desktop.'
          });
        }
      } else {
        // Browser download
        downloadViaBrowser(csv, fileName);
      }
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Download Failed' });
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper function for browser downloads
  const downloadViaBrowser = (csv: string, fileName: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Report Downloaded' });
  };

  const now = new Date();
  const currentQuarterNum = getQuarter(now);
  const currentYear = getYear(now);

  return (
    <div className="space-y-6">
      {/* YEAR SELECTOR */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Select Year to View</h3>
          </div>

          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {[...Array(5)].map((_, i) => (
                <SelectItem key={i} value={(currentYear - i).toString()}>
                  {currentYear - i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <Accordion type="single" collapsible defaultValue={`item-${getQuarter(new Date())}`}>
          {quarters.map((quarter) => {
            const completionPercentage =
              quarter.total === 0 ? 0 : (quarter.completed / quarter.total) * 100;

            const isPastQuarter =
              year < currentYear || (year === currentYear && quarter.id < currentQuarterNum);

            const qSearch = (searchTerms[quarter.id] || '').toLowerCase();

            const filteredHouseholds = (quarter.householdsInQuarter || []).filter(
              (h) =>
                h.familyName.toLowerCase().includes(qSearch) ||
                h.locationArea.toLowerCase().includes(qSearch)
            );

            return (
              <AccordionItem key={quarter.id} value={`item-${quarter.id}`} className="bg-card rounded-lg border mb-2">
                <AccordionTrigger className="p-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold">{quarter.name}</h4>
                      <Badge
                        variant="secondary"
                        className={{
                          Completed: 'bg-green-100 text-green-800',
                          Incomplete: 'bg-red-100 text-red-800',
                          Pending: 'bg-orange-100 text-orange-800',
                          'Partially Completed': 'bg-blue-100 text-blue-800',
                        }[quarter.status]}
                      >
                        {quarter.status}
                      </Badge>
                    </div>

                    <div className="hidden md:block w-1/4">
                      <p className="text-sm text-muted-foreground">Completion</p>
                      <Progress value={completionPercentage} className="h-2 mt-1" />
                    </div>

                    <div className="font-semibold text-muted-foreground">
                      {quarter.completed}/{quarter.total}
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="p-4 pt-0">
                  {/* STATS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
                    <Card className="p-3 flex items-center">
                      <ArrowUpRight className="h-5 w-5 text-green-500 mr-2" />
                      <div>
                        <p className="text-sm text-muted-foreground">Improved</p>
                        <p className="font-bold">{quarter.improved}</p>
                      </div>
                    </Card>

                    <Card className="p-3 flex items-center">
                      <ArrowDownRight className="h-5 w-5 text-red-500 mr-2" />
                      <div>
                        <p className="text-sm text-muted-foreground">Declined</p>
                        <p className="font-bold">{quarter.declined}</p>
                      </div>
                    </Card>

                    <Card className="p-3 flex items-center">
                      <Minus className="h-5 w-5 text-gray-500 mr-2" />
                      <div>
                        <p className="text-sm text-muted-foreground">No Change</p>
                        <p className="font-bold">{quarter.noChange}</p>
                      </div>
                    </Card>

                    <Card className="p-3 flex items-center">
                      <HelpCircle className="h-5 w-5 text-yellow-500 mr-2" />
                      <div>
                        <p className="text-sm text-muted-foreground">Not Recorded</p>
                        <p className="font-bold">{quarter.notRecorded}</p>
                      </div>
                    </Card>
                  </div>

                  {/* DOWNLOAD */}
                  <div className="flex justify-end my-4">
                    <Button
                      onClick={() => handleDownload(quarter.id)}
                      disabled={isDownloading || quarter.completed === 0}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4 mr-2" />
                      )}
                      {isDownloading ? 'Generating...' : `Download Q${quarter.id} Report`}
                    </Button>
                  </div>

                  {/* 🔍 DARK MODE SEARCH BAR (SAME AS HOUSEHOLDS PAGE) */}
                  <div className="max-w-sm mb-4">
                    <input
                      type="text"
                      placeholder="Search family..."
                      value={searchTerms[quarter.id] || ''}
                      onChange={(e) =>
                        setSearchTerms({ ...searchTerms, [quarter.id]: e.target.value })
                      }
                      className="w-full border border-input bg-background text-foreground rounded-md p-2
                      focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* TABLE */}
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
                        {filteredHouseholds.length > 0 ? (
                          filteredHouseholds.map((household) => {
                            const visit =
                              quarter.visits.find((v) => v.householdId === household.id) || null;

                            const visitStatus = visit?.status || 'Pending';

                            const householdChildren =
                              children.filter((c) => c.householdId === household.id) || [];

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
                                      visitStatus === 'Completed' ? 'default' : 'secondary'
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
                                  {visit ? (
                                    visitStatus === 'Completed' ? (
                                      <div className="flex items-center justify-end gap-2">
                                        <CheckCircle2 className="text-green-600 h-5 w-5" />
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            router.push(
                                              `/households/${household.id}/follow-ups/${visit.id}/conduct`
                                            )
                                          }
                                        >
                                          <PenSquare className="h-4 w-4 mr-2" />
                                          Edit
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          router.push(
                                            `/households/${household.id}/follow-ups/${visit.id}/conduct`
                                          )
                                        }
                                      >
                                        <PenSquare className="h-4 w-4 mr-2" />
                                        Start Survey
                                      </Button>
                                    )
                                  ) : (
                                    <span className="text-muted-foreground text-sm italic">
                                      Visit missing
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center py-6 text-muted-foreground"
                            >
                              No matching families
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
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
  return <QuarterlyReportContent />;
}
