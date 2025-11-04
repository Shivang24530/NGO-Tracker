import Link from 'next/link';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowUpRight, Users, HandCoins, UserRoundCheck, Siren, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { households, children, followUpVisits } from '@/lib/data';

const totalFamilies = households.length;
const totalChildren = children.length;
const childrenStudying = children.filter((c) => c.isStudying).length;
const visitsThisQuarter = followUpVisits.filter(
  (v) => new Date(v.visitDate) > new Date().setMonth(new Date().getMonth() - 3)
).length;
const overdueVisits = followUpVisits.filter(v => v.status === 'Overdue').length;

const stats = [
    { title: 'Total Families', value: totalFamilies, icon: Users, change: "+5 this month" },
    { title: 'Total Children', value: totalChildren, icon: HandCoins, change: "+12 this month" },
    { title: 'Children Studying', value: childrenStudying, icon: UserRoundCheck, change: "+2 this month" },
    { title: 'Visits This Quarter', value: visitsThisQuarter, icon: Users, change: "85% completed" },
];

export default function Dashboard() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <PageHeader title="Dashboard" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {overdueVisits > 0 && (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
            <Siren className="h-4 w-4" />
            <AlertTitle className="font-headline">Overdue Visits Alert!</AlertTitle>
            <div className="flex items-center justify-between">
              <AlertDescription>
                You have {overdueVisits} overdue follow-up visits. Please attend to them immediately.
              </AlertDescription>
              <Link href="/follow-ups">
                <Button variant="link" className="text-destructive">
                  View Visits <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Alert>
        )}
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2 shadow-lg">
            <CardHeader className="flex flex-row items-center">
              <div className="grid gap-2">
                <CardTitle>Recent Activity</CardTitle>
                <p className="text-sm text-muted-foreground">
                  An overview of recent family registrations and visits.
                </p>
              </div>
              <Button asChild size="sm" className="ml-auto gap-1 bg-accent text-accent-foreground hover:bg-accent/80">
                <Link href="/reports">
                  View All
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-6">
                {households.slice(0, 4).map(h => (
                    <div key={h.id} className="flex items-center gap-4">
                        <div className="hidden h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
                           <Users className="h-5 w-5"/>
                        </div>
                        <div className="grid gap-1">
                            <p className="text-sm font-medium leading-none">{h.familyName} Registered</p>
                            <p className="text-sm text-muted-foreground">{h.fullAddress}</p>
                        </div>
                        <div className="ml-auto font-medium">{new Date(h.visits[0]?.visitDate || Date.now()).toLocaleDateString()}</div>
                    </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
