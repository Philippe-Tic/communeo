import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setColorScheme, useColorScheme } from '@/lib/color-scheme';

export function ColorSchemeToggle() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      className="aria-pressed:border aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:text-brand"
      aria-label="Mode sombre"
      aria-pressed={dark}
      onClick={() => setColorScheme(dark ? 'light' : 'dark')}
    >
      {dark ? <Sun aria-hidden="true" strokeWidth={1.75} className="size-[18px]" /> : <Moon aria-hidden="true" strokeWidth={1.75} className="size-[18px]" />}
    </Button>
  );
}
