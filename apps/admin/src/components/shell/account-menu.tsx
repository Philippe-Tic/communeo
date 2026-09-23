import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { auth } from '@/lib/api';
import { logout as endSession } from '@/lib/session';
import { displayName, type SessionUser } from '@/lib/session';
import { cn, initials } from '@/lib/utils';

export function Avatar({ user, size = 30 }: { user: SessionUser; size?: 30 | 36 }) {
  return (
    <span
      aria-hidden="true"
      className={cn('grid shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand', size === 30 ? 'size-[30px] text-xs' : 'size-9 text-[13px]')}
    >
      {initials(displayName(user))}
    </span>
  );
}

export function AccountMenu({ user, compact }: { user: SessionUser; compact?: boolean }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const name = displayName(user);

  const logout = async () => {
    await endSession().catch(() => undefined);
    auth.setImpersonatedSite(null);
    // Quitter l'administration d'abord : vider le cache avec l'en-tête encore affiché relancerait ses
    // requêtes, refusées faute de session
    await navigate({ to: '/connexion' });
    client.clear();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn('flex items-center gap-1.5 rounded-full p-0.5 hover:bg-surface-hover', compact && 'size-11 justify-center')}
        aria-label={`Compte de ${name}`}
      >
        <Avatar user={user} size={compact ? 36 : 30} />
        {!compact && <ChevronDown aria-hidden="true" className="size-4 text-secondary" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block font-semibold text-text">{name}</span>
          <span className="block">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate({ to: '/mon-compte' })}>
          <UserRound aria-hidden="true" />
          Mon compte
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={logout}>
          <LogOut aria-hidden="true" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
