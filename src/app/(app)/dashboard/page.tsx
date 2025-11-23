'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, UserPlus, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFollowUpLogic } from '@/hooks/use-follow-up-logic';
import { getQuarter } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";

export default function Dashboard() {
  const { t } = useLanguage();

  const { households, children, visits, isLoading } =
    useFollowUpLogic(new Date().getFullYear());

  const recentRegistrations = households?.slice(0, 5) || [];

  const totalFamilies = households?.length ?? 0;
  const totalChildren = children?.length ?? 0;
  const childrenStudying = children?.filter((c) => c.isStudying).length ?? 0;
  const childrenNotStudying = totalChildren - childrenStudying;

  const currentQuarter = getQuarter(new Date());
  const completedVisitsInQuarter =
    visits?.filter(
      (v) =>
        v.status === 'Completed' &&
        getQuarter(new Date(v.visitDate)) === currentQuarter
    ) || [];

  const visitsThisQuarter = new Set(
    completedVisitsInQuarter.map((v) => v.householdId)
  ).size;

  const stats = [
    {
      title: t("total_families"),
      value: totalFamilies,
      icon: Users,
      color: 'bg-orange-500',
      progress:
        totalFamilies > 0
          ? (totalFamilies / (households?.length || 1)) * 100
          : 0,
    },
    {
      title: t("total_children"),
      value: totalChildren,
      icon: Users,
      color: 'bg-pink-500',
      progress:
        totalChildren > 0 ? (totalChildren / (children?.length || 1)) * 100 : 0,
    },
    {
      title: t("children_studying"),
      value: childrenStudying,
      icon: TrendingUp,
      color: 'bg-green-500',
      progress:
        totalChildren > 0 ? (childrenStudying / totalChildren) * 100 : 0,
    },
    {
      title: t("visit_quarter"),
      value: visitsThisQuarter,
      icon: Clock,
      color: 'bg-purple-500',
      progress:
        visitsThisQuarter > 0
          ? (visitsThisQuarter / (totalFamilies || 1)) * 100
          : 0,
    },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title={`${t("welcome")} 👋`}>
        <p className="text-sm text-muted-foreground hidden md:block">
          {t("dashboard_subtitle")}
        </p>
        <div className="ml-auto">
          <Button asChild>
            <Link href="/households/register">
              <UserPlus className="mr-2 h-4 w-4" />
              {t("register_family")}
            </Link>
          </Button>
        </div>
      </PageHeader>

      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <Card
                  key={index}
                  className="shadow-sm hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <div
                        className={`flex items-center justify-center h-8 w-8 rounded-lg bg-primary/20`}
                      >
                        <stat.icon className={`h-5 w-5 text-primary`} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                    <Progress value={stat.progress} className="mt-2 h-2" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">

              {/* Recent Registrations */}
              <Card className="xl:col-span-2 shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">
                      {t("recent_registrations")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-0">
                  {recentRegistrations.map((h, index) => (
                    <div
                      key={h.id}
                      className={`flex items-center gap-4 p-4 ${
                        index < 4 ? 'border-b' : ''
                      }`}
                    >
                      <div className="grid gap-1">
                        <p className="text-sm font-medium leading-none">
                          {h.familyName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @ {h.locationArea}
                        </p>
                      </div>
                      <div className="ml-auto font-medium text-sm text-muted-foreground">
                        {new Date(h.nextFollowupDue).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                  {recentRegistrations.length === 0 && (
                    <p className="p-4 text-center text-muted-foreground">
                      {t("no_recent_registrations")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Children Overview */}
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">
                      {t("children_overview")}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-800">
                        {t("currently_studying")}
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        {childrenStudying}
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 text-green-700" />
                  </div>

                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-800">
                        {t("not_studying")}
                      </p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {childrenNotStudying}
                      </p>
                    </div>
                    <AlertTriangle className="h-6 w-6 text-yellow-700" />
                  </div>
                </CardContent>
              </Card>

            </div>
          </>
        )}
      </main>
    </div>
  );
}
