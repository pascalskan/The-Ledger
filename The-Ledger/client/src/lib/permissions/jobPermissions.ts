import { User, Role } from "../../types/auth";
import { Job } from "../../types/job";
import { isAdmin, isCEO, isProjectManager, isWorker } from "./roleGuards";

export function canViewJob(user: User, roles: Role[], job: Job): boolean {
  if (isAdmin(user, roles) || isCEO(user, roles)) {
    return true;
  }

  if (isProjectManager(user, roles)) {
    return job.managerId === user.id;
  }

  return job.assignedWorkerIds.includes(user.id);
}

export function canEditJob(user: User, roles: Role[], job: Job): boolean {
  if (isAdmin(user, roles) || isCEO(user, roles)) {
    return true;
  }

  if (isProjectManager(user, roles)) {
    return job.managerId === user.id;
  }

  return false;
}

export function canAssignWorkers(user: User, roles: Role[]): boolean {
  return (
    isAdmin(user, roles) || isCEO(user, roles) || isProjectManager(user, roles)
  );
}

export function canManageJobFinancials(user: User, roles: Role[]): boolean {
  return isAdmin(user, roles) || isCEO(user, roles);
}
