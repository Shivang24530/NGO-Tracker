"use client";

import { SidebarTrigger } from '@/components/ui/sidebar';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-auto min-h-14 items-center gap-4 border-b bg-background/95 p-4 backdrop-blur-sm sm:h-auto sm:p-6">

      <SidebarTrigger className="md:hidden w-12 h-12 p-2 [&_svg]:w-full [&_svg]:h-full" />

      <div className="flex-1 flex items-center gap-4">
        <h1 className="font-headline text-2xl font-bold md:text-3xl">
          {title}
        </h1>
        {children}
      </div>

      {/* Language toggle button */}
      {/* Theme and Language toggles */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </header>
  );
}
