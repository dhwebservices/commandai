# Examples

```ts
import { TenantRepository } from "@commandai/tenant-service";
import { createSupabaseAdminClient } from "../../api-gateway/src/modules/auth/supabase-admin.client";

const repo = new TenantRepository(supabaseAdminClient);
const tenant = await repo.findById(tenantId);
```
