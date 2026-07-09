# Examples

```ts
import { Tenant, isHomeTenant } from "@commandai/tenant-service";

const tenant = Tenant.parse(rawRecord);
if (isHomeTenant(tenant)) {
  // same code path as any other tenant — no special-casing
}
```
