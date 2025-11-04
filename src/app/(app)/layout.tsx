import type { Metadata } from 'next';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/common/main-nav';

export const metadata: Metadata = {
  title: 'Community Compass Dashboard',
  description: 'NGO Community Tracker for field workers and administrators.',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" variant="sidebar" side="left">
        <MainNav />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
