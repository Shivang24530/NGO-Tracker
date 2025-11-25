'use client';

import { useState, useMemo } from 'react';
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
import { ArrowUp, ArrowDown, Loader2, Users, Minus, HelpCircle, Search } from 'lucide-react';
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
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProgressTrackingPage() {
  const { t } = useLanguage();

  const currentYear = new Date().getFullYear();
  const { quarters, households, children, isLoading } =
    useFollowUpLogic(currentYear);

  const currentQuarterNum = getQuarter(new Date());
  const currentQuarter = quarters.find((q) => q.id === currentQuarterNum);

  const totalChildren = children.length ?? 0;
  const improvedCount = currentQuarter?.improved ?? 0;
  const declinedCount = currentQuarter?.declined ?? 0;
  const noChangeCount = currentQuarter?.noChange ?? 0;
  const notRecordedCount = currentQuarter?.notRecorded ?? 0;

  const findHouseholdName = (householdId: string) => {
    return households?.find((h) => h.id === householdId)?.familyName || '...';
  };

  // 🔍 SEARCH BAR STATE
  const [searchTerm, setSearchTerm] = useState("");

  // 🔍 OPTIMIZED CLIENT-SIDE FILTERING
  const filteredChildren = useMemo(() => {
    if (!children) return [];
    if (!searchTerm.trim()) return children;

    const term = searchTerm.toLowerCase();

    return children.filter((child) => {
      const householdName = findHouseholdName(child.householdId).toLowerCase();
      const location = households?.find(h => h.id === child.householdId)?.locationArea.toLowerCase() || "";

      return (
        child.name.toLowerCase().includes(term) ||
        householdName.includes(term) ||
        location.includes(term) ||
        (child.currentClass || "").toLowerCase().includes(term)
      );
    });
  }, [children, searchTerm, households]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title={t('progress_tracking')} />

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">

        {/* 🔍 SEARCH BAR */}
        <div className="max-w-sm">
          <div className="flex items-center gap-2 border border-input bg-background rounded-md px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("search_family")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background text-foreground p-2 focus:outline-none"
            />
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">

          {/* Total Children */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('total_children')}</CardDescription>
              <CardTitle className="text-4xl text-blue-600">
                {isLoading ? '...' : totalChildren}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center">
                <Users className="h-4 w-4 mr-1 text-blue-600" />
                {t('all_registered_children')}
              </div>
            </CardContent>
          </Card>

          {/* Improved */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('improved')}</CardDescription>
              <CardTitle className="text-4xl text-primary">
                {isLoading ? '...' : improvedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center">
                <ArrowUp className="h-4 w-4 mr-1 text-primary" />
                {t('current_quarter_progress')}
              </div>
            </CardContent>
          </Card>

          {/* Declined */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('declined')}</CardDescription>
              <CardTitle className="text-4xl text-destructive">
                {isLoading ? '...' : declinedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center">
                <ArrowDown className="h-4 w-4 mr-1 text-destructive" />
                {t('current_quarter_progress')}
              </div>
            </CardContent>
          </Card>

          {/* No Change */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('no_change')}</CardDescription>
              <CardTitle className="text-4xl text-gray-500">
                {isLoading ? '...' : noChangeCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center">
                <Minus className="h-4 w-4 mr-1 text-gray-500" />
                {t('current_quarter_progress')}
              </div>
            </CardContent>
          </Card>

          {/* Not Recorded */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('not_recorded')}</CardDescription>
              <CardTitle className="text-4xl text-yellow-500">
                {isLoading ? '...' : notRecordedCount}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center">
                <HelpCircle className="h-4 w-4 mr-1 text-yellow-500" />
                {t('data_not_recorded')}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('child_list')}</CardTitle>
            <CardDescription>{t('child_list_desc')}</CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('child_name')}</TableHead>
                  <TableHead>{t('family')}</TableHead>
                  <TableHead>{t('age')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">
                    {t('current_class')}
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredChildren.length > 0 ? (
                  filteredChildren.map((child: Child) => (
                    <TableRow key={child.id}>
                      <TableCell className="font-medium">{child.name}</TableCell>
                      <TableCell>{findHouseholdName(child.householdId)}</TableCell>
                      <TableCell>{calculateAge(child.dateOfBirth)}</TableCell>

                      <TableCell>
                        <Badge
                          variant={child.isStudying ? 'default' : 'destructive'}
                          className={
                            child.isStudying
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {child.isStudying
                            ? t('studying')
                            : t('not_studying')}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {child.isStudying ? child.currentClass : t('not_applicable')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      {t('no_children_found')}
                    </TableCell>
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
