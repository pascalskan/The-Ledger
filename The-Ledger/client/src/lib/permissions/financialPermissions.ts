import { User, Role } from "../../types/auth";
import {
  isAdmin,
  isCEO,
  isProjectManager,
  isWorker,
  isClient,
} from "./roleGuards";

// Workers and clients should not view any financial data.
// PMs can view, but not manage invoices, expenses, or integrations.
// CEOs/Admins have full access.

export function canViewFinancials(user: User, roles: Role[]): boolean {
  if (isClient(user, roles) || isWorker(user, roles)) {
    return false;
  }
  return (
    isAdmin(user, roles) || isCEO(user, roles) || isProjectManager(user, roles)
  );
}

export function canManageInvoices(user: User, roles: Role[]): boolean {
  return isAdmin(user, roles) || isCEO(user, roles);
}

export function canManageExpenses(user: User, roles: Role[]): boolean {
  return isAdmin(user, roles) || isCEO(user, roles);
}

export function canManageIntegrations(user: User, roles: Role[]): boolean {
  return isAdmin(user, roles) || isCEO(user, roles);
}
