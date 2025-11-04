import { SidebarTrigger } from '@/components/ui/sidebar';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-auto min-h-14 items-center gap-4 border-b bg-background/95 p-4 backdrop-blur-sm sm:h-auto sm:p-6">
      <SidebarTrigger className="md:hidden" />
      <div className="flex-1 flex items-center gap-4">
        <h1 className="font-headline text-2xl font-bold md:text-3xl">
          {title}
        </h1>
        {children}
      </div>
    </header>
  );
}
