import type { User } from "@/types/auth";
import type { Role } from "@/types/auth";

function getRoleNames(user: User | null, roles: Role[]): string[] {
  return (user?.roleIds ?? [])
    .map((rid) => roles.find((r) => r.id === rid)?.name)
    .filter((n): n is string => Boolean(n));
}

export function isCEO(user: User | null, roles: Role[]): boolean {
  return getRoleNames(user, roles).includes("CEO");
}

export function isProjectManager(user: User | null, roles: Role[]): boolean {
  return getRoleNames(user, roles).includes("Project Manager");
}

export function isWorker(user: User | null, roles: Role[]): boolean {
  return getRoleNames(user, roles).includes("Worker");
}

export function isClient(user: User | null, roles: Role[]): boolean {
  return getRoleNames(user, roles).includes("Client");
}
