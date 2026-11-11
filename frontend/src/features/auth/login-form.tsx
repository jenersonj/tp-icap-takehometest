'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoginInputSchema, type LoginInput } from '@blotter/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircleIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { errorMessage } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Spinner } from '@/shared/ui/spinner';

import { authApi } from './auth-api';

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: { username: '', password: '' },
  });
  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session, session);
      onSuccess();
    },
  });
  const { errors } = form.formState;

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => login.mutate(values))}>
      <FieldGroup>
        {login.isError && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{errorMessage(login.error)}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={Boolean(errors.username)}>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            autoComplete="username"
            autoFocus
            aria-invalid={Boolean(errors.username)}
            {...form.register('username')}
          />
          <FieldError errors={[errors.username]} />
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...form.register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending && <Spinner />}
          Sign in
        </Button>
      </FieldGroup>
    </form>
  );
}
