export type WorkerRoleTag = "Owner" | "Admin" | "Manager" | "Supervisor" | "Crew Lead" | "Worker" | "Contractor" | "Driver";

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_jobs: "View jobs",
  edit_jobs: "Edit jobs",
  manage_workers: "Manage workers",
  assign_roles: "Assign roles",
  view_audit_log: "View audit log",
  manage_clients: "Manage clients",
  manage_equipment: "Manage equipment",
  manage_invoicing: "Manage invoicing",
  view_documents: "View documents",
  manage_settings: "Manage settings",
};

export type PermissionKey =
  | "view_jobs"
  | "edit_jobs"
  | "manage_workers"
  | "assign_roles"
  | "view_audit_log"
  | "manage_clients"
  | "manage_equipment"
  | "manage_invoicing"
  | "view_documents"
  | "manage_settings";

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  companyId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleIds: string[];
  companyId: string;
}
