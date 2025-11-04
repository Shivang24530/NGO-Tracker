'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Heart,
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  TrendingUp,
  BarChart3,
  FileText,
  Map,
  Users
} from 'lucide-react';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { UserNav } from './user-nav';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/households/register', label: 'Register Family', icon: UserPlus },
  { href: '/households', label: 'All Families', icon: Users },
  { href: '/map', label: 'Map Overview', icon: Map },
  { href: '/follow-ups', label: 'Follow-up Visits', icon: ClipboardList },
  { href: '/progress', label: 'Progress Tracking', icon: TrendingUp },
  { href: '/reports', label: 'Quarterly Reports', icon: FileText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-white rounded-md p-1.5 flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <h1 className="text-lg font-bold font-headline text-background">
              NGO Tracker
            </h1>
            <p className="text-xs text-sidebar-foreground/80">Family Registration</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <div className='text-xs font-medium text-sidebar-foreground/60 px-4 mt-2 group-data-[collapsible=icon]:hidden'>NAVIGATION</div>
        <SidebarMenu className='mt-2'>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  }
                  tooltip={item.label}
                  className="justify-start"
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="my-1 bg-sidebar-border" />
      <SidebarFooter>
        <UserNav />
      </SidebarFooter>
    </>
  );
}
