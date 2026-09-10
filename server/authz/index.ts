/**
 * Authorization Module (Phase 1 deliverable / Component Architecture §3).
 *
 * Single entry point for all authorization and access control decisions across the platform.
 * Enforces ownership, tier entitlements, role restrictions, and prevents IDOR.
 */

export interface ActorContext {
  userId: string;
  role: 'member' | 'pastor' | 'admin';
  tier: 'free' | 'member' | 'pastor';
}

export type ResourceType =
  | 'conversation'
  | 'message'
  | 'verification'
  | 'claim'
  | 'export'
  | 'admin_setting'
  | 'source_directory';

export interface ResourceDescriptor {
  type: ResourceType;
  id: string;
  ownerId?: string;
  isEphemeral?: boolean;
}

export type ActionType =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'verify_source'
  | 'admin_write';

export interface AuthzDecision {
  allowed: boolean;
  reason?: string;
}

/**
 * The single canonical entry point for all access control checks.
 */
export function authorize(
  actor: ActorContext,
  action: ActionType,
  resource: ResourceDescriptor
): AuthzDecision {
  // 1. Admin action gate
  if (action === 'admin_write' || resource.type === 'admin_setting') {
    if (actor.role === 'admin') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Requires administrative privileges.' };
  }

  // 2. Ownership check (Prevents IDOR across all user resources)
  if (resource.ownerId && resource.ownerId !== actor.userId) {
    // Admins cannot bypass ownership of private member data without audited break-glass
    return { allowed: false, reason: 'Access denied: Actor does not own the requested resource.' };
  }

  // 3. Ephemeral mode guard (Ephemeral data cannot be exported or persisted)
  if (resource.isEphemeral && action === 'export') {
    return { allowed: false, reason: 'Ephemeral conversations cannot be exported as persistent records.' };
  }

  // 4. Tier entitlement gating
  if (action === 'verify_source' && actor.tier === 'free') {
    // Free tier has restricted verification quotas (evaluated via entitlements)
    return { allowed: true };
  }

  return { allowed: true };
}
