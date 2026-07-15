// Update admin view to make rows clickable for full detail pages

// Replace the existing user table rows to be clickable
function updateAdminUserTable() {
  const userRows = document.querySelectorAll('.admin-users-table tbody tr');
  userRows.forEach(row => {
    const userId = row.dataset.userId;
    if (userId) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        // Don't navigate if clicking a button
        if (e.target.tagName === 'BUTTON') return;
        showUserDetails(userId);
      });
    }
  });
}

// Replace the existing org table rows to be clickable
function updateAdminOrgTable() {
  const orgRows = document.querySelectorAll('.admin-orgs-table tbody tr');
  orgRows.forEach(row => {
    const orgId = row.dataset.orgId;
    if (orgId) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        // Don't navigate if clicking a button
        if (e.target.tagName === 'BUTTON') return;
        showOrganizationDetails(orgId);
      });
    }
  });
}

window.updateAdminUserTable = updateAdminUserTable;
window.updateAdminOrgTable = updateAdminOrgTable;
