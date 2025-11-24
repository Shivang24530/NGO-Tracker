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
  Users,
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
import { useLanguage } from '@/contexts/LanguageContext';

export function MainNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/households/register', label: t('register_family'), icon: UserPlus },
    { href: '/households', label: t('all_families'), icon: Users },
    { href: '/map', label: t('map_overview'), icon: Map },
    { href: '/follow-ups', label: t('follow_up_visits'), icon: ClipboardList },
    { href: '/progress', label: t('progress_tracking'), icon: TrendingUp },
    { href: '/reports', label: t('quarterly_reports'), icon: FileText },
    { href: '/analytics', label: t('analytics'), icon: BarChart3 },
  ];

  return (
    <>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-white dark:bg-gray-800 rounded-md p-1.5 flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>

          {/* HEADER - DO NOT TRANSLATE */}
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <h1 className="text-lg font-bold font-headline text-sidebar-foreground">
              NGO Tracker
            </h1>
            <p className="text-xs text-sidebar-foreground/80">
              Family Registration
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <div className="text-xs font-medium text-sidebar-foreground/60 px-4 mt-2 group-data-[collapsible=icon]:hidden">
          {t("navigation")}
        </div>

        <SidebarMenu className="mt-2">
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname === item.href}
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
