import type { Pool } from "pg";
import { withTenantContext } from "@commandai/db";
import { Tenant, assertHasOwner, type TenantMember } from "./tenant.model";

/**
 * Every read/write here goes through the same Tenant shape regardless of
 * tier (Design Principle #3) — there is no separate "home tenant" table
 * or query path. `assertHasOwner` is checked at the application layer in
 * addition to the DB trigger (infra/db/migrations/0001_create_tenants.sql)
 * — defense in depth, not either/or.
 */
export class TenantRepository {
  constructor(private readonly pool: Pool) {}

  async create(tenant: Omit<Tenant, "createdAt">): Promise<Tenant> {
    assertHasOwner(tenant as Tenant);

    return withTenantContext(this.pool, tenant.id, async (client) => {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO tenants (id, name, type, parent_tenant_id, blocked_capability_ids)
         VALUES ($1, $2, $3, $4, $5)`,
        [tenant.id, tenant.name, tenant.type, tenant.parentTenantId, tenant.blockedCapabilityIds],
      );

      for (const member of tenant.members) {
        await client.query(
          `INSERT INTO tenant_members (tenant_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, $4)`,
          [tenant.id, member.userId, member.role, member.joinedAt],
        );
      }

      const row = await client.query(`SELECT created_at FROM tenants WHERE id = $1`, [tenant.id]);
      await client.query("COMMIT");

      return Tenant.parse({ ...tenant, createdAt: row.rows[0].created_at.toISOString() });
    });
  }

  async findById(tenantId: string): Promise<Tenant | null> {
    return withTenantContext(this.pool, tenantId, async (client) => {
      const tenantRow = await client.query(
        `SELECT id, name, type, parent_tenant_id AS "parentTenantId",
                blocked_capability_ids AS "blockedCapabilityIds", created_at AS "createdAt"
         FROM tenants WHERE id = $1`,
        [tenantId],
      );
      if (tenantRow.rows.length === 0) return null;

      const memberRows = await client.query(
        `SELECT user_id AS "userId", role, joined_at AS "joinedAt"
         FROM tenant_members WHERE tenant_id = $1`,
        [tenantId],
      );

      const members: TenantMember[] = memberRows.rows.map((r) => ({
        userId: r.userId,
        role: r.role,
        joinedAt: r.joinedAt.toISOString(),
      }));

      return Tenant.parse({
        ...tenantRow.rows[0],
        createdAt: tenantRow.rows[0].createdAt.toISOString(),
        members,
      });
    });
  }
}
