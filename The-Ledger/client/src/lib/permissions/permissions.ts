import { User, Role, PermissionKey } from "../../types/auth";

export function getUserPermissions(
  user: User,
  roles: Role[]
): PermissionKey[] {
  const userRoleIds = new Set(user.roleIds);
  const userRoles = roles.filter((role) => userRoleIds.has(role.id));
  const permissions = userRoles.flatMap((role) => role.permissions);
  return Array.from(new Set(permissions));
}

export function hasPermission(
  user: User,
  roles: Role[],
  permission: PermissionKey
): boolean {
  const userPermissions = getUserPermissions(user, roles);
  return userPermissions.includes(permission);
}

export function hasAnyPermission(
  user: User,
  roles: Role[],
  permissions: PermissionKey[]
): boolean {
  const userPermissions = new Set(getUserPermissions(user, roles));
  return permissions.some((p) => userPermissions.has(p));
}
