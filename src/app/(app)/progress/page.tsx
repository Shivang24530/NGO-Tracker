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
import { children, households } from '@/lib/data';
import { ProgressAnalysis } from '@/components/genai/progress-analysis';
import { ArrowUp, ArrowDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ProgressTrackingPage() {
  const childrenWithStatus = children.map(child => {
    const status = Math.random() > 0.5 ? 'Improved' : 'Declined';
    return { ...child, status };
  });

  const improvedCount = childrenWithStatus.filter(c => c.status === 'Improved').length;
  const declinedCount = childrenWithStatus.filter(c => c.status === 'Declined').length;


  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Progress Tracking" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Improved (Back to School)</CardDescription>
                    <CardTitle className="text-4xl text-primary">{improvedCount}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-xs text-muted-foreground flex items-center">
                        <ArrowUp className="h-4 w-4 mr-1 text-primary" />
                        +5% from last quarter
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardDescription>Declined (Dropped Out)</CardDescription>
                    <CardTitle className="text-4xl text-destructive">{declinedCount}</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="text-xs text-muted-foreground flex items-center">
                        <ArrowDown className="h-4 w-4 mr-1 text-destructive" />
                        +2% from last quarter
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
                {childrenWithStatus.map((child) => (
                  <TableRow key={child.id}>
                    <TableCell className="font-medium">{child.name}</TableCell>
                    <TableCell>{households.find(h => h.id === child.householdId)?.familyName}</TableCell>
                    <TableCell>{child.age}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
