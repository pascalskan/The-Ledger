import { User, Role } from "../../types/auth";

function getUserRoles(user: User, roles: Role[]): Role[] {
  const userRoleIds = new Set(user.roleIds);
  return roles.filter((role) => userRoleIds.has(role.id));
}

export function isAdmin(user: User, roles: Role[]): boolean {
  return getUserRoles(user, roles).some(
    (role) => role.name.toLowerCase() === "admin"
  );
}

export function isCEO(user: User, roles: Role[]): boolean {
  return getUserRoles(user, roles).some(
    (role) => role.name.toLowerCase() === "ceo"
  );
}

export function isProjectManager(user: User, roles: Role[]): boolean {
  return getUserRoles(user, roles).some(
    (role) => role.name.toLowerCase() === "project manager"
  );
}

export function isWorker(user: User, roles: Role[]): boolean {
  return getUserRoles(user, roles).some(
    (role) => role.name.toLowerCase() === "worker"
  );
}

export function isClient(user: User, roles: Role[]): boolean {
  return getUserRoles(user, roles).some(
    (role) => role.name.toLowerCase() === "client"
  );
}
