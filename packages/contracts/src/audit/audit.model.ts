export const AuditAction = {
  CREATED: 'CREATED',
  AMENDED: 'AMENDED',
  CANCELLED: 'CANCELLED',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
