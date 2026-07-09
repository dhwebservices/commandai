# Examples

```ts
import { AuditLog, recordTransition, findExecutedWithoutAudit } from "@commandai/audit-service";

const log = new AuditLog();
recordTransition(log, action, "Executed", "agent-1", "scheduled disk check");

// periodic monitoring job:
const gaps = findExecutedWithoutAudit(allActions, log);
if (gaps.length > 0) {
  // alert — audit write failed for these actions
}
```
