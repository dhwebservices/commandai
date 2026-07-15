// ===== Comprehensive Admin Detail Views =====

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show detailed user view
async function showUserDetails(userId) {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.5);">Loading user details...</div>';

  try {
    // Fetch user data
    const usersData = await ipcRenderer.invoke('admin-get-users');
    const user = usersData.users.find(u => u.id === userId);
    
    if (!user) {
      contentArea.innerHTML = '<div class="empty-state"><div class="empty-title">User not found</div></div>';
      return;
    }

    // Fetch organizations for assignment dropdown
    const orgsData = await ipcRenderer.invoke('admin-get-organizations');
    const organizations = orgsData.organizations || [];

    contentArea.innerHTML = `
      <div class="section">
        <div class="section-header">
          <button class="btn-secondary" onclick="switchView('admin')" style="margin-right: auto;">← Back to Admin</button>
          <div class="section-title">User Details: ${escapeHtml(user.username)}</div>
          <button class="btn-danger" onclick="deleteUser('${escapeHtml(user.id)}', '${escapeHtml(user.username)}')">Delete User</button>
        </div>

        <div class="stats-grid" style="margin-bottom: 1.5rem;">
          <div class="stat-card">
            <div class="stat-label">User ID</div>
            <div class="stat-value" style="font-size: 0.875rem;">${user.id.slice(0, 8)}...</div>
            <div class="stat-subtitle">Unique Identifier</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Role</div>
            <div class="stat-value">${user.role}</div>
            <div class="stat-subtitle">Access Level</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Status</div>
            <div class="stat-value">${user.emailVerified ? 'Verified' : 'Unverified'}</div>
            <div class="stat-subtitle">Email Verification</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Created</div>
            <div class="stat-value">${new Date(user.createdAt).toLocaleDateString()}</div>
            <div class="stat-subtitle">Account Age</div>
          </div>
        </div>

        <!-- User Information -->
        <div class="section">
          <div class="section-header">
            <div class="section-title">Account Information</div>
            <button class="btn-primary" onclick="editUserDetails('${user.id}')">Edit Info</button>
          </div>
          <div class="table-container">
            <table>
              <tbody>
                <tr>
                  <td style="width: 200px;"><strong>Username</strong></td>
                  <td>${user.username}</td>
                  <td><button class="btn-sm" onclick="changeUsername('${user.id}', '${user.username}')">Change</button></td>
                </tr>
                <tr>
                  <td><strong>Email</strong></td>
                  <td>${user.email || 'Not set'}</td>
                  <td><button class="btn-sm" onclick="changeEmail('${user.id}')">Change</button></td>
                </tr>
                <tr>
                  <td><strong>Role</strong></td>
                  <td><span class="activity-badge ${user.role === 'platform_admin' ? 'running' : 'completed'}">${user.role}</span></td>
                  <td><button class="btn-sm" onclick="changeRole('${user.id}', '${user.role}')">Change</button></td>
                </tr>
                <tr>
                  <td><strong>Organization</strong></td>
                  <td>${user.tenant?.name || 'None'} (${user.tenant?.type || 'N/A'})</td>
                  <td><button class="btn-sm" onclick="changeOrganization('${user.id}', '${user.tenant?.id || ''}')">Change</button></td>
                </tr>
                <tr>
                  <td><strong>Email Verified</strong></td>
                  <td>${user.emailVerified ? '✓ Yes' : '✗ No'}</td>
                  <td><button class="btn-sm" onclick="toggleEmailVerification('${user.id}', ${!user.emailVerified})">${user.emailVerified ? 'Unverify' : 'Verify'}</button></td>
                </tr>
                <tr>
                  <td><strong>Password</strong></td>
                  <td>••••••••</td>
                  <td><button class="btn-sm" onclick="resetPassword('${user.id}', '${user.username}')">Reset</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Security & Access -->
        <div class="section">
          <div class="section-header">
            <div class="section-title">Security & Access</div>
          </div>
          <div class="actions-grid">
            <div class="action-card" onclick="forceLogout('${user.id}', '${user.username}')">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <div class="action-label">Force Logout</div>
            </div>
            <div class="action-card" onclick="suspendAccount('${user.id}', '${user.username}')">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
              <div class="action-label">Suspend Account</div>
            </div>
            <div class="action-card" onclick="resetPassword('${user.id}', '${user.username}')">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <div class="action-label">Reset Password</div>
            </div>
            <div class="action-card" onclick="sendVerificationEmail('${user.id}', '${user.email}')">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <div class="action-label">Send Verification Email</div>
            </div>
          </div>
        </div>

        <!-- Activity & Logs -->
        <div class="section">
          <div class="section-header">
            <div class="section-title">Activity & Logs</div>
          </div>
          <div class="empty-state">
            <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <div class="empty-title">Login history and command logs coming soon</div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    contentArea.innerHTML = `<div class="empty-state"><div class="empty-title">Failed to load user details</div><div class="empty-desc">${error.message}</div></div>`;
  }
}

// Show detailed organization view
async function showOrganizationDetails(orgId) {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.5);">Loading organization details...</div>';

  try {
    // Fetch organization data
    const orgsData = await ipcRenderer.invoke('admin-get-organizations');
    const org = orgsData.organizations.find(o => o.id === orgId);
    
    if (!org) {
      contentArea.innerHTML = '<div class="empty-state"><div class="empty-title">Organization not found</div></div>';
      return;
    }

    // Fetch users in this organization
    const usersData = await ipcRenderer.invoke('admin-get-users');
    const orgUsers = usersData.users.filter(u => u.tenant?.id === orgId);

    contentArea.innerHTML = `
      <div class="section">
        <div class="section-header">
          <button class="btn-secondary" onclick="switchView('admin')" style="margin-right: auto;">← Back to Admin</button>
          <div class="section-title">Organization: ${escapeHtml(org.name)}</div>
          <button class="btn-danger" onclick="deleteOrganization('${escapeHtml(org.id)}', '${escapeHtml(org.name)}')">Delete Organization</button>
        </div>

        <div class="stats-grid" style="margin-bottom: 1.5rem;">
          <div class="stat-card">
            <div class="stat-label">Members</div>
            <div class="stat-value">${orgUsers.length}</div>
            <div class="stat-subtitle">Active Users</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Type</div>
            <div class="stat-value">${org.type}</div>
            <div class="stat-subtitle">Account Type</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Blocked</div>
            <div class="stat-value">${org.blockedCapabilities.length}</div>
            <div class="stat-subtitle">Capabilities</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Created</div>
            <div class="stat-value">${new Date(org.createdAt).toLocaleDateString()}</div>
            <div class="stat-subtitle">Since</div>
          </div>
        </div>

        <!-- Organization Settings -->
        <div class="section">
          <div class="section-header">
            <div class="section-title">Organization Settings</div>
            <button class="btn-primary" onclick="editOrganizationSettings('${org.id}')">Edit Settings</button>
          </div>
          <div class="table-container">
            <table>
              <tbody>
                <tr>
                  <td style="width: 200px;"><strong>Organization ID</strong></td>
                  <td>${org.id.slice(0, 8)}...</td>
                  <td></td>
                </tr>
                <tr>
                  <td><strong>Name</strong></td>
                  <td>${org.name}</td>
                  <td><button class="btn-sm" onclick="editOrgName('${org.id}', '${org.name}')">Change</button></td>
                </tr>
                <tr>
                  <td><strong>Type</strong></td>
                  <td><span class="activity-badge completed">${org.type}</span></td>
                  <td><button class="btn-sm" onclick="editOrgType('${org.id}', '${org.type}')">Change</button></td>
                </tr>
                <tr>
                  <td><strong>Parent Organization</strong></td>
                  <td>${org.parentTenantId || 'None (Top-level)'}</td>
                  <td><button class="btn-sm" onclick="editOrgParent('${org.id}')">Change</button></td>
                </tr>
                <tr>
                  <td><strong>Blocked Capabilities</strong></td>
                  <td>${org.blockedCapabilities.length > 0 ? org.blockedCapabilities.join(', ') : 'None'}</td>
                  <td><button class="btn-sm" onclick="manageBlockedCapabilities('${org.id}')">Manage</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Members -->
        <div class="section">
          <div class="section-header">
            <div class="section-title">Members (${orgUsers.length})</div>
            <button class="btn-primary" onclick="addUserToOrganization('${org.id}', '${org.name}')">Add Member</button>
          </div>
          ${orgUsers.length > 0 ? `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${orgUsers.map(user => `
                  <tr>
                    <td style="font-weight: 600;">${user.username}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td><span class="activity-badge ${user.role === 'platform_admin' ? 'running' : 'completed'}">${user.role}</span></td>
                    <td><span class="activity-badge ${user.emailVerified ? 'completed' : 'failed'}">${user.emailVerified ? 'Active' : 'Pending'}</span></td>
                    <td>
                      <button class="btn-sm" onclick="showUserDetails('${user.id}')" style="margin-right: 0.5rem;">View</button>
                      <button class="btn-sm" onclick="changeUserRole('${user.id}', '${user.role}')">Change Role</button>
                      <button class="btn-sm btn-danger" onclick="removeUserFromOrganization('${user.id}', '${user.username}', '${org.id}')">Remove</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : '<div class="empty-state"><div class="empty-title">No members</div><div class="empty-desc">Add users to this organization</div></div>'}
        </div>

        <!-- Capabilities & Permissions -->
        <div class="section">
          <div class="section-header">
            <div class="section-title">Capabilities & Permissions</div>
            <button class="btn-primary" onclick="manageOrgCapabilities('${org.id}')">Manage</button>
          </div>
          <div class="actions-grid">
            <div class="action-card">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <div class="action-label">All Capabilities</div>
              <div style="font-size: 0.7rem; color: #737373; margin-top: 0.25rem;">${org.blockedCapabilities.length} blocked</div>
            </div>
            <div class="action-card" onclick="alert('Feature access control coming soon')">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <div class="action-label">Feature Access</div>
            </div>
            <div class="action-card" onclick="alert('API access management coming soon')">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
              </svg>
              <div class="action-label">API Access</div>
            </div>
          </div>
        </div>

        <!-- Billing & Usage (Placeholder) -->
        <div class="section">
          <div class="section-header">
            <div class="section-title">Billing & Usage</div>
          </div>
          <div class="empty-state">
            <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            <div class="empty-title">Billing and usage tracking coming soon</div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    contentArea.innerHTML = `<div class="empty-state"><div class="empty-title">Failed to load organization details</div><div class="empty-desc">${error.message}</div></div>`;
  }
}

// Make functions globally available
window.showUserDetails = showUserDetails;
window.showOrganizationDetails = showOrganizationDetails;
