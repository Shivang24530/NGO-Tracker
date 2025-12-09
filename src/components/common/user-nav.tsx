'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings } from 'lucide-react';
import placeholderImages from '@/lib/placeholder-images.json';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '../ui/button';
import { useAuth, useUser } from '@/firebase';

export function UserNav() {
  const { state } = useSidebar();
  const { user } = useUser();
  const auth = useAuth();

  const userContent = (
    <>
      <Avatar className="h-10 w-10 md:h-8 md:w-8">
        <AvatarFallback className="text-lg font-bold">P</AvatarFallback>
      </Avatar>
      <div className="text-left group-data-[collapsible=icon]:hidden">
        <p className="text-sm font-medium leading-none text-sidebar-foreground">PACE</p>
        <p className="text-xs leading-none text-muted-foreground">
          {user?.email || ''}
        </p>
      </div>
    </>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {state === 'collapsed' ? (
          <Button variant="ghost" className="relative h-12 w-12 md:h-10 md:w-10 p-2 rounded-full">
            {userContent}
          </Button>
        ) : (
          <Button variant="ghost" className="relative h-14 md:h-12 w-full flex justify-start items-center gap-2 p-3 md:p-2">
            {userContent}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">PACE</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || ''}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/change-credentials" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Change Credentials</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => auth.signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
