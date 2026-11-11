'use client';

import { CandlestickChartIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { LoginForm } from '@/features/auth/login-form';
import { ThemeToggle } from '@/shared/components/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

const DEMO_USERS = [
  { username: 'jsmith', role: 'Trader, all books' },
  { username: 'abrown', role: 'Trader, US and tech' },
  { username: 'viewer', role: 'Read-only' },
];

function Login() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  // Only same-app paths, so ?next= cannot send the user to another site.
  const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/blotter';
  return <LoginForm onSuccess={() => router.replace(target)} />;
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-svh items-center justify-center p-6">
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CandlestickChartIcon className="size-5" /> Trade Blotter
          </CardTitle>
          <CardDescription>Sign in with a demo account (password: password123).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Suspense>
            <Login />
          </Suspense>
          <ul className="text-xs text-muted-foreground">
            {DEMO_USERS.map((u) => (
              <li key={u.username}>
                <span className="font-mono text-foreground">{u.username}</span> · {u.role}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
