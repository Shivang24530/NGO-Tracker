'use client';

import { useState } from 'react';
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
import { Button } from '../ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { households, followUpVisits } from '@/lib/data';
import { Badge } from '../ui/badge';
import { toast } from '@/hooks/use-toast';

export function ReportTable() {
  const [year, setYear] = useState('2025');
  const [quarter, setQuarter] = useState('4');
  const [isDownloading, setIsDownloading] = useState(false);

  // In a real app, this data would be filtered based on year and quarter
  const reportData = households.map(h => {
      const visit = followUpVisits.find(v => v.householdId === h.id);
      return {
          ...h,
          visitStatus: visit?.status || 'Pending',
      }
  })

  const handleDownload = () => {
    setIsDownloading(true);
    // Simulate CSV generation and download
    setTimeout(() => {
        setIsDownloading(false);
        toast({
            title: "Report Downloaded",
            description: `Q${quarter} ${year} report has been successfully generated.`,
        });
    }, 1500)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
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

        <Select value={quarter} onValueChange={setQuarter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Quarter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Quarter 1</SelectItem>
            <SelectItem value="2">Quarter 2</SelectItem>
            <SelectItem value="3">Quarter 3</SelectItem>
            <SelectItem value="4">Quarter 4</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleDownload} disabled={isDownloading} className="ml-auto bg-accent text-accent-foreground hover:bg-accent/90">
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4" />}
            {isDownloading ? "Generating..." : `Download Q${quarter} Report`}
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Family Name</TableHead>
              <TableHead>Location Area</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead className="text-right">Survey Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.slice(0, 10).map((household) => (
              <TableRow key={household.id}>
                <TableCell className="font-medium">{household.familyName}</TableCell>
                <TableCell>{household.locationArea}</TableCell>
                <TableCell>{new Date(household.nextFollowupDue).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={
                      household.visitStatus === 'Completed' ? 'default' : household.visitStatus === 'Overdue' ? 'destructive' : 'secondary'
                  } className={
                    household.visitStatus === 'Completed' ? 'bg-green-100 text-green-800' : ''
                  }>
                    {household.visitStatus}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
