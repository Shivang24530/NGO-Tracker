'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { isPast, isSameDay } from 'date-fns';
import {
  Clock,
  CalendarCheck,
  AlertCircle,
  Users,
  TrendingUp,
  Loader2,
  Search
} from 'lucide-react';
import { useFollowUpLogic } from '@/hooks/use-follow-up-logic';
import { useLanguage } from "@/contexts/LanguageContext";

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  isLoading,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  isLoading: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className={`flex items-center justify-center h-8 w-8 rounded-full bg-${color}-100`}>
        <Icon className={`h-5 w-5 text-${color}-600`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{isLoading ? '...' : value}</div>
    </CardContent>
  </Card>
);

export default function FollowUpsPage() {
  const { t } = useLanguage();
  const { households, visits, isLoading } = useFollowUpLogic(new Date().getFullYear());

  const now = new Date();

  // ⭐ ADD SEARCH STATE
  const [searchTerm, setSearchTerm] = useState("");

  // ⭐ CLIENT-SIDE OPTIMIZED FILTER (0 database reads)
  const filteredHouseholds = useMemo(() => {
    if (!households) return [];
    if (!searchTerm.trim()) return households;

    const term = searchTerm.toLowerCase();
    return households.filter(h =>
      h.familyName.toLowerCase().includes(term) ||
      h.locationArea.toLowerCase().includes(term)
    );
  }, [households, searchTerm]);

  const overdue =
    visits?.filter(
      (v) =>
        v.status === 'Pending' &&
        isPast(new Date(v.visitDate)) &&
        !isSameDay(new Date(v.visitDate), now)
    ) ?? [];

  const upcoming =
    visits?.filter((v) => v.status === 'Pending' && !isPast(new Date(v.visitDate))) ?? [];

  const completed = visits?.filter((v) => v.status === 'Completed') ?? [];

  const recentVisits =
    completed
      .sort(
        (a, b) =>
          new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
      )
      .slice(0, 5) ?? [];

  const getHouseholdName = (householdId: string) =>
    households?.find((h) => h.id === householdId)?.familyName || t("unknown_family");

  const getHouseholdLocation = (householdId: string) =>
    households?.find((h) => h.id === householdId)?.locationArea || '';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title={t("follow_up_visits")}>
        <p className="text-sm text-muted-foreground hidden md:block">
          {t("follow_up_subtitle")}
        </p>
      </PageHeader>

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* ⭐ SEARCH BAR (Dark Mode Optimized) */}
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

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

              <StatCard
                title={t("overdue_visits")}
                value={overdue.filter(v => filteredHouseholds.some(h => h.id === v.householdId)).length}
                icon={AlertCircle}
                color="red"
                isLoading={isLoading}
              />

              <StatCard
                title={t("upcoming_visits")}
                value={upcoming.filter(v => filteredHouseholds.some(h => h.id === v.householdId)).length}
                icon={Clock}
                color="orange"
                isLoading={isLoading}
              />

              <StatCard
                title={t("visits_completed")}
                value={completed.filter(v => filteredHouseholds.some(h => h.id === v.householdId)).length}
                icon={CalendarCheck}
                color="green"
                isLoading={isLoading}
              />

              <StatCard
                title={t("total_families")}
                value={filteredHouseholds.length}
                icon={Users}
                color="blue"
                isLoading={isLoading}
              />
            </div>

            {/* Overdue + Upcoming */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Overdue */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" /> 
                    {t("overdue_visits")} ({overdue.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {overdue.filter(v => filteredHouseholds.some(h => h.id === v.householdId)).length > 0 ? (
                    <div className="space-y-4">
                      {overdue
                        .filter(v => filteredHouseholds.some(h => h.id === v.householdId))
                        .map((visit) => (
                        <Link
                          href={`/households/${visit.householdId}/follow-ups/${visit.id}/conduct`}
                          key={visit.id}
                          className="block border p-4 rounded-lg hover:bg-secondary"
                        >
                          <div className="flex justify-between items-center">
                            <p className="font-semibold">
                              {getHouseholdName(visit.householdId)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(visit.visitDate).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getHouseholdLocation(visit.householdId)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground space-y-2">
                      <CalendarCheck className="mx-auto h-12 w-12 text-green-500" />
                      <h3 className="font-semibold">{t("no_overdue_visits")}</h3>
                      <p>{t("great_work")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" /> 
                    {t("upcoming_visits")} ({upcoming.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcoming.filter(v => filteredHouseholds.some(h => h.id === v.householdId)).length > 0 ? (
                    <div className="space-y-4">
                      {upcoming
                        .filter(v => filteredHouseholds.some(h => h.id === v.householdId))
                        .map((visit) => (
                        <Link
                          href={`/households/${visit.householdId}/follow-ups/${visit.id}/conduct`}
                          key={visit.id}
                          className="block border p-4 rounded-lg hover:bg-secondary"
                        >
                          <div className="flex justify-between items-center">
                            <p className="font-semibold">
                              {getHouseholdName(visit.householdId)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(visit.visitDate).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getHouseholdLocation(visit.householdId)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground space-y-2">
                      <CalendarCheck className="mx-auto h-12 w-12" />
                      <h3 className="font-semibold">{t("no_upcoming_visits")}</h3>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Visits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" /> 
                  {t("recent_visits")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentVisits.filter(v => filteredHouseholds.some(h => h.id === v.householdId)).length > 0 ? (
                  <div className="space-y-2">
                    {recentVisits
                      .filter(v => filteredHouseholds.some(h => h.id === v.householdId))
                      .map((visit) => (
                      <div key={visit.id} className="border p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <p className="font-semibold">
                              {getHouseholdName(visit.householdId)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("by_person")} {visit.visitedBy}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(visit.visitDate).toLocaleDateString()}
                          </p>
                        </div>

                        {visit.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            "{visit.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    {t("no_recent_visits")}
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
