import type { LoginInput, SessionDto } from '@blotter/contracts';

import { api } from '@/shared/api/api-client';

export const authApi = {
  login: (input: LoginInput) => api.post<SessionDto>('/auth/login', input),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<SessionDto>('/auth/me'),
};
