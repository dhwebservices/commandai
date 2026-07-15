# COMPREHENSIVE BUG FIXES - IN PROGRESS

## Audit Summary
- **Desktop App**: 15+ critical bugs found
- **API Backend**: 25+ critical bugs found
- **Desktop Agent**: 65+ critical bugs found
- **TOTAL**: 100+ bugs being fixed

---

## DESKTOP APP FIXES

### FIX #1: Remove Duplicate Function Definitions ✅ IN PROGRESS
**Problem**: Four functions defined twice (sync + async versions), causing unpredictable behavior
**Files**: `apps/desktop-app/src/app.js`
**Action**: Delete lines 470-629 (sync versions of getApplicationsView, getSecurityView, getNetworkingView, getStorageView)
**Why**: The async versions (lines 1416+, 1507+, 1612+, 1679+) are correct and load real data

### FIX #2: Add Authentication Headers to IPC Calls
**Problem**: get-intents and get-result make unauthenticated API calls
**Files**: `apps/desktop-app/src/main.ts` lines 348-374
**Action**: Add Authorization header with access token

### FIX #3: Fix XSS Vulnerabilities
**Problem**: User input not escaped in admin panels
**Files**: `apps/desktop-app/src/admin-details.js` lines 26, 172
**Action**: Wrap user.username and org.name in escapeHtml()

### FIX #4: Remove views.js Dead Code
**Problem**: views.js exists but not loaded, contains stale code
**Files**: `apps/desktop-app/src/views.js`
**Action**: Delete entire file (not used)

---

## API BACKEND FIXES

### FIX #5: Add Authentication Guard on Agents Endpoint
**Problem**: enrollment-tokens endpoint has NO authentication
**Files**: `apps/api-gateway/src/modules/agents/agents.controller.ts` line 23
**Action**: Add @UseGuards decorator and verify user is admin

### FIX #6: Fix SQL Injection in Commands Service
**Problem**: Dynamic .or() query with unsanitized tenantId
**Files**: `apps/api-gateway/src/modules/commands/commands.service.ts` line 22
**Action**: Use parameterized query instead of template literal

### FIX #7: Fix Race Condition in User Deletion
**Problem**: Deletes profile first, then auth user - inconsistent state if second fails
**Files**: `apps/api-gateway/src/modules/admin/admin.service.ts` lines 177-196
**Action**: Reverse order or use transaction

### FIX #8: Fix Broken User Count Logic
**Problem**: userCounts returns {data: Map} but code accesses as Map directly
**Files**: `apps/api-gateway/src/modules/admin/admin.service.ts` lines 81-90
**Action**: Fix destructuring - use userCounts.data.get() or restructure

### FIX #9: Add Input Validation DTOs
**Problem**: Admin endpoints use `any` type with no validation
**Files**: Multiple admin controller endpoints
**Action**: Create Zod schemas for all admin DTOs

---

## DESKTOP AGENT FIXES

### FIX #10: Fix Shell Command Injection Vulnerabilities
**Problem**: User parameters directly interpolated in shell commands
**Files**:
- `apps/desktop-agent/src/agent.ts` lines 115-120, 134-140
- `apps/desktop-agent/src/executors/process-executor.ts` lines 95, 112, 115, 118
- `apps/desktop-agent/src/executors/network-executor.ts` lines 50-51, 73
- `apps/desktop-agent/src/executors/system-executor.ts` lines 293, 321
**Action**: Use proper escaping/sanitization for all shell parameters

### FIX #11: Add Parameter Validation
**Problem**: No validation that parameters are correct types
**Files**: All executor files
**Action**: Add parameter type checking and bounds validation

### FIX #12: Remove Sudo Commands or Handle Properly
**Problem**: Commands requiring sudo will hang waiting for password
**Files**: Multiple system-executor.ts commands
**Action**: Either remove sudo requirements or add sudoers configuration docs

### FIX #13: Fix Download Function Promise Bug
**Problem**: fs.open() Promise created but not awaited
**Files**: `apps/desktop-agent/src/executors/network-executor.ts` line 112
**Action**: Use createWriteStream or properly await file handle

### FIX #14: Add Path Validation
**Problem**: No directory traversal protection
**Files**: All file-executor.ts methods
**Action**: Add path normalization and bounds checking

---

## STATUS: FIXING NOW
Starting with desktop app critical fixes, then backend, then agent.
Each fix will be verified before moving to next.
