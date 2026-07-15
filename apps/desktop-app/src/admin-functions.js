// ===== Comprehensive Admin Management Functions =====

// User Management Functions

async function changeUsername(userId, currentUsername) {
  const newUsername = prompt(`Enter new username for ${currentUsername}:`, currentUsername);
  if (!newUsername || newUsername === currentUsername) return;

  try {
    await ipcRenderer.invoke('admin-update-user', userId, { username: newUsername });
    alert('Username updated successfully!');
    showUserDetails(userId);
  } catch (error) {
    alert('Failed to update username: ' + error.message);
  }
}

async function changeEmail(userId) {
  const newEmail = prompt('Enter new email address:');
  if (!newEmail) return;

  try {
    await ipcRenderer.invoke('admin-update-user', userId, { email: newEmail });
    alert('Email updated successfully!');
    showUserDetails(userId);
  } catch (error) {
    alert('Failed to update email: ' + error.message);
  }
}

async function changeRole(userId, currentRole) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Change User Role</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Select New Role</label>
          <select id="newRoleSelect" class="form-input">
            <option value="viewer" ${currentRole === 'viewer' ? 'selected' : ''}>Viewer (Read-only)</option>
            <option value="member" ${currentRole === 'member' ? 'selected' : ''}>Member (Standard access)</option>
            <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Admin (Full org access)</option>
            <option value="owner" ${currentRole === 'owner' ? 'selected' : ''}>Owner (Organization owner)</option>
            <option value="platform_admin" ${currentRole === 'platform_admin' ? 'selected' : ''}>Platform Admin (Full platform access)</option>
          </select>
        </div>
        <div style="padding: 0.75rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; font-size: 0.875rem; color: #EF4444;">
          <strong>Warning:</strong> Changing roles affects user permissions immediately.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="saveRoleChange('${userId}')">Save Role</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveRoleChange(userId) {
  const newRole = document.getElementById('newRoleSelect').value;
  try {
    await ipcRenderer.invoke('admin-update-user', userId, { role: newRole });
    alert('Role updated successfully!');
    closeModal(document.querySelector('.modal'));
    showUserDetails(userId);
  } catch (error) {
    alert('Failed to update role: ' + error.message);
  }
}

async function changeOrganization(userId, currentTenantId) {
  const orgsData = await ipcRenderer.invoke('admin-get-organizations');
  const organizations = orgsData.organizations || [];

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Change Organization</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Select Organization</label>
          <select id="newOrgSelect" class="form-input">
            ${organizations.map(org => `
              <option value="${org.id}" ${org.id === currentTenantId ? 'selected' : ''}>${org.name} (${org.type})</option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="saveOrgChange('${userId}')">Move User</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveOrgChange(userId) {
  const newTenantId = document.getElementById('newOrgSelect').value;
  try {
    await ipcRenderer.invoke('admin-update-user', userId, { tenantId: newTenantId });
    alert('User moved to new organization!');
    closeModal(document.querySelector('.modal'));
    showUserDetails(userId);
  } catch (error) {
    alert('Failed to move user: ' + error.message);
  }
}

async function toggleEmailVerification(userId, newStatus) {
  if (!confirm(`Are you sure you want to ${newStatus ? 'verify' : 'unverify'} this user's email?`)) {
    return;
  }

  try {
    await ipcRenderer.invoke('admin-update-user', userId, { emailVerified: newStatus });
    alert(`Email ${newStatus ? 'verified' : 'unverified'} successfully!`);
    showUserDetails(userId);
  } catch (error) {
    alert('Failed to update email verification: ' + error.message);
  }
}

async function resetPassword(userId, username) {
  const newPassword = prompt(`Enter new password for ${username}:`);
  if (!newPassword) return;

  const confirm = prompt('Confirm new password:');
  if (confirm !== newPassword) {
    alert('Passwords do not match!');
    return;
  }

  try {
    await ipcRenderer.invoke('admin-reset-user-password', userId, newPassword);
    alert('Password reset successfully!');
  } catch (error) {
    alert('Failed to reset password: ' + error.message);
  }
}

async function forceLogout(userId, username) {
  if (!confirm(`Force logout ${username}? This will end all their active sessions.`)) {
    return;
  }

  alert('Force logout functionality coming soon - this will invalidate all user sessions');
}

async function suspendAccount(userId, username) {
  if (!confirm(`Suspend account for ${username}? They will not be able to log in.`)) {
    return;
  }

  alert('Account suspension coming soon - this will prevent user login');
}

async function sendVerificationEmail(userId, email) {
  if (!email) {
    alert('User has no email address set');
    return;
  }

  if (!confirm(`Send verification email to ${email}?`)) {
    return;
  }

  alert('Verification email functionality coming soon');
}

// Organization Management Functions

async function editOrgName(orgId, currentName) {
  const newName = prompt('Enter new organization name:', currentName);
  if (!newName || newName === currentName) return;

  try {
    await ipcRenderer.invoke('admin-update-organization', orgId, { name: newName });
    alert('Organization name updated!');
    showOrganizationDetails(orgId);
  } catch (error) {
    alert('Failed to update name: ' + error.message);
  }
}

async function editOrgType(orgId, currentType) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Change Organization Type</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Select Account Type</label>
          <select id="newTypeSelect" class="form-input">
            <option value="home" ${currentType === 'home' ? 'selected' : ''}>Personal</option>
            <option value="business" ${currentType === 'business' ? 'selected' : ''}>Business</option>
            <option value="enterprise" ${currentType === 'enterprise' ? 'selected' : ''}>Enterprise</option>
            <option value="msp" ${currentType === 'msp' ? 'selected' : ''}>MSP (Managed Service Provider)</option>
            <option value="msp_client" ${currentType === 'msp_client' ? 'selected' : ''}>MSP Client</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="saveOrgType('${orgId}')">Save Type</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveOrgType(orgId) {
  const newType = document.getElementById('newTypeSelect').value;
  try {
    await ipcRenderer.invoke('admin-update-organization', orgId, { type: newType });
    alert('Organization type updated!');
    closeModal(document.querySelector('.modal'));
    showOrganizationDetails(orgId);
  } catch (error) {
    alert('Failed to update type: ' + error.message);
  }
}

async function editOrgParent(orgId) {
  alert('Parent organization management coming soon - allows creating hierarchies');
}

async function manageBlockedCapabilities(orgId) {
  alert('Capability blocking UI coming soon - control which features this org can use');
}

async function addUserToOrganization(orgId, orgName) {
  const usersData = await ipcRenderer.invoke('admin-get-users');
  const availableUsers = usersData.users.filter(u => u.tenant?.id !== orgId);

  if (availableUsers.length === 0) {
    alert('No users available to add. All users are already in this organization or other organizations.');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add Member to ${orgName}</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Select User</label>
          <select id="userToAddSelect" class="form-input">
            ${availableUsers.map(user => `
              <option value="${user.id}">${user.username} (${user.email || 'No email'}) - Currently in: ${user.tenant?.name || 'None'}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Role in Organization</label>
          <select id="newMemberRole" class="form-input">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="saveAddUserToOrg('${orgId}')">Add Member</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveAddUserToOrg(orgId) {
  const userId = document.getElementById('userToAddSelect').value;
  const role = document.getElementById('newMemberRole').value;

  try {
    await ipcRenderer.invoke('admin-update-user', userId, { tenantId: orgId, role: role });
    alert('User added to organization!');
    closeModal(document.querySelector('.modal'));
    showOrganizationDetails(orgId);
  } catch (error) {
    alert('Failed to add user: ' + error.message);
  }
}

async function removeUserFromOrganization(userId, username, orgId) {
  if (!confirm(`Remove ${username} from this organization? They will be moved to a personal account.`)) {
    return;
  }

  alert('Remove user functionality coming soon - will create new personal organization for user');
}

async function changeUserRole(userId, currentRole) {
  changeRole(userId, currentRole);
}

async function manageOrgCapabilities(orgId) {
  alert('Full capability management UI coming soon - enable/disable specific features for this organization');
}

async function editUserDetails(userId) {
  showUserDetails(userId);
}

async function editOrganizationSettings(orgId) {
  editOrganization({ id: orgId });
}

// Make all functions globally available
window.changeUsername = changeUsername;
window.changeEmail = changeEmail;
window.changeRole = changeRole;
window.saveRoleChange = saveRoleChange;
window.changeOrganization = changeOrganization;
window.saveOrgChange = saveOrgChange;
window.toggleEmailVerification = toggleEmailVerification;
window.resetPassword = resetPassword;
window.forceLogout = forceLogout;
window.suspendAccount = suspendAccount;
window.sendVerificationEmail = sendVerificationEmail;
window.editOrgName = editOrgName;
window.editOrgType = editOrgType;
window.saveOrgType = saveOrgType;
window.editOrgParent = editOrgParent;
window.manageBlockedCapabilities = manageBlockedCapabilities;
window.addUserToOrganization = addUserToOrganization;
window.saveAddUserToOrg = saveAddUserToOrg;
window.removeUserFromOrganization = removeUserFromOrganization;
window.changeUserRole = changeUserRole;
window.manageOrgCapabilities = manageOrgCapabilities;
window.editUserDetails = editUserDetails;
window.editOrganizationSettings = editOrganizationSettings;
