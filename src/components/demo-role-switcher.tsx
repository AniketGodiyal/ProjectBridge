import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, DEMO_PERSONA_TITLE, ROLE_HOME, type DemoPersona } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

export function DemoRoleSwitcher({ compact = false }: { compact?: boolean }) {
  const { personas, activePersona, switchPersona } = useAuth();
  const navigate = useNavigate();

  if (!activePersona) return null;

  const handleSelect = (persona: DemoPersona) => {
    switchPersona(persona.key);
    navigate(ROLE_HOME[persona.role]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserCog className="h-4 w-4" />
          {compact ? 'Role' : 'Switch role'}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl p-1.5 shadow-xl">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Preview as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {personas.map((persona) => {
          const isActive = persona.key === activePersona.key;
          return (
            <DropdownMenuItem key={persona.key} onClick={() => handleSelect(persona)} className="items-start gap-2 rounded-lg">
              <Check className={cn('mt-0.5 h-4 w-4 shrink-0 text-accent', isActive ? 'opacity-100' : 'opacity-0')} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{DEMO_PERSONA_TITLE[persona.key]}</p>
                <p className="truncate text-xs text-muted-foreground">{persona.label}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          Role switching is a preview convenience, not secure authorization.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
