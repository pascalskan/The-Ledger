import { User, Role } from "../../types/auth";
import { ReviewItem } from "../../types/review";
import { Job } from "../../types/job";
import { isAdmin, isCEO, isProjectManager, isClient } from "./roleGuards";
import { canViewJob } from "./jobPermissions";

export function canViewReviewItem(
  user: User,
  roles: Role[],
  reviewItem: ReviewItem,
  job: Job
): boolean {
  if (isClient(user, roles)) {
    return false;
  }

  if (reviewItem.jobId !== job.id) {
    return false;
  }

  return canViewJob(user, roles, job);
}

export function canApproveReview(user: User, roles: Role[]): boolean {
  return isAdmin(user, roles) || isCEO(user, roles) || isProjectManager(user, roles);
}

export function canRejectReview(user: User, roles: Role[]): boolean {
  return canApproveReview(user, roles);
}

export function canRequestCorrection(user: User, roles: Role[]): boolean {
  return canApproveReview(user, roles);
}
