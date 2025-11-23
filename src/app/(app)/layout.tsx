import type { Metadata } from 'next';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/common/main-nav';
import { useUser } from '@/firebase/auth/use-user';
import { redirect } from 'next/navigation';
import { AuthGuard } from '@/components/auth/auth-guard';

export const metadata: Metadata = {
  title: 'Community Compass Dashboard',
  description: 'NGO Community Tracker for field workers and administrators.',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider defaultOpen={true}>
        <Sidebar collapsible="icon" variant="sidebar" side="left">
          <MainNav />
        </Sidebar>
        <SidebarInset className='bg-background'>{children}</SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
