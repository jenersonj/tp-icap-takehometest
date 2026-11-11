'use client';

import { LogOutIcon } from 'lucide-react';

import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

import { useCurrentUser, useLogout } from './session';

export function UserMenu() {
  const user = useCurrentUser();
  const logout = useLogout();
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-medium">{user.username}</span>
      <Badge variant={user.role === 'TRADER' ? 'default' : 'secondary'}>{user.role}</Badge>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Sign out"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
      >
        <LogOutIcon />
      </Button>
    </div>
  );
}
