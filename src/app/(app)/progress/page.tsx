
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
import { ArrowUp, ArrowDown, Loader2, Users, Minus, HelpCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useFollowUpLogic } from '@/hooks/use-follow-up-logic';
import type { Child } from '@/lib/types';
import { getQuarter } from 'date-fns';
import { calculateAge } from '@/lib/utils';

export default function ProgressTrackingPage() {
  const currentYear = new Date().getFullYear();
  const { quarters, households, children, isLoading } = useFollowUpLogic(currentYear);

  const currentQuarterNum = getQuarter(new Date());
  const currentQuarter = quarters.find(q => q.id === currentQuarterNum);

  const totalChildren = children.length ?? 0;
  const improvedCount = currentQuarter?.improved ?? 0;
  const declinedCount = currentQuarter?.declined ?? 0;
  const noChangeCount = currentQuarter?.noChange ?? 0;
  const notRecordedCount = currentQuarter?.notRecorded ?? 0;
  
  const findHouseholdName = (householdId: string) => {
    return households?.find(h => h.id === householdId)?.familyName || '...';
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Progress Tracking" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-5">
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
                        Current quarter progress
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
                        Current quarter progress
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>No Change</CardDescription>
                    <CardTitle className="text-4xl text-gray-500">{isLoading ? '...' : noChangeCount}</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="text-xs text-muted-foreground flex items-center">
                        <Minus className="h-4 w-4 mr-1 text-gray-500" />
                        Current quarter progress
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Not Recorded</CardDescription>
                    <CardTitle className="text-4xl text-yellow-500">{isLoading ? '...' : notRecordedCount}</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="text-xs text-muted-foreground flex items-center">
                        <HelpCircle className="h-4 w-4 mr-1 text-yellow-500" />
                        Data not recorded this quarter
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
                ) : children.length > 0 ? (
                  children.map((child: Child) => (
                  <TableRow key={child.id}>
                    <TableCell className="font-medium">{child.name}</TableCell>
                    <TableCell>{findHouseholdName(child.householdId)}</TableCell>
                    <TableCell>{calculateAge(child.dateOfBirth)}</TableCell>
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
