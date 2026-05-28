export interface AuditLogEvent {
  id: string;

  entityType: AuditEntityType;
  entityId: string;

  action: string;

  actorId: string;
  actorName: string;

  previousValue?: unknown;
  newValue?: unknown;

  relatedMutationId?: string;

  timestamp: string;
}

export type AuditEntityType =
  | "Job"
  | "Worker"
  | "Client"
  | "Invoice"
  | "ReviewItem"
  | "Role"
  | "User";
