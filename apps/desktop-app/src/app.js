const { ipcRenderer } = require('electron');

// State
let currentView = 'home';
let userSession = null;
let activities = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  // Load session
  userSession = await ipcRenderer.invoke('get-session');

  if (userSession && userSession.userId) {
    updateUserInfo(userSession);
    loadDeviceName();
    loadActivities();
  }

  // Setup navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      switchView(item.dataset.view);
    });
  });

  // Logout button (topbar)
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to log out?')) {
      ipcRenderer.invoke('logout');
    }
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    switchView('settings');
  });

  // Load initial view
  switchView('home');

  // Auto-refresh activity
  setInterval(loadActivities, 5000);
}

function updateUserInfo(session) {
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  const userRole = document.getElementById('userRole');

  userName.textContent = session.userId.slice(0, 20);
  userAvatar.textContent = session.userId.slice(0, 2).toUpperCase();

  // Display role
  const roleLabels = {
    platform_admin: 'Platform Admin',
    owner: 'Admin',
    admin: 'Admin',
    member: 'Member',
    user: 'User',
  };

  const displayRole = roleLabels[session.role] || 'Member';

  // Platform admin has access to all account types
  let tenantLabel;
  if (session.role === 'platform_admin') {
    tenantLabel = 'All Access';
  } else {
    tenantLabel = session.tenantType === 'business' ? session.tenantName : 'Personal';
  }

  userRole.textContent = `${displayRole} • ${tenantLabel}`;
}

async function loadDeviceName() {
  const name = await ipcRenderer.invoke('get-device-name');
  if (name) {
    document.getElementById('deviceName').textContent = name;
  }
}

async function loadActivities() {
  try {
    const intents = await ipcRenderer.invoke('get-intents');

    // Fetch results for each intent
    const activitiesWithResults = await Promise.all(
      intents.map(async (intent) => {
        try {
          const result = await ipcRenderer.invoke('get-result', intent.id);
          return { ...intent, result };
        } catch (error) {
          console.error(`Failed to load result for intent ${intent.id}:`, error);
          return intent;
        }
      })
    );

    activities = activitiesWithResults;
  } catch (error) {
    console.error('Failed to load activities:', error);
  }
}

async function switchView(viewName) {
  currentView = viewName;

  // Update navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update page title
  const titles = {
    home: 'Home',
    devices: 'Devices',
    applications: 'Applications',
    security: 'Security',
    networking: 'Networking',
    storage: 'Storage',
    processes: 'Processes',
    activity: 'Activity',
    automation: 'Automation',
    admin: 'Admin'
  };

  document.getElementById('pageTitle').textContent = titles[viewName] || 'Comandr';

  // Load view content
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = '<div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.5);">Loading...</div>';

  const content = await getViewContent(viewName);
  contentArea.innerHTML = content;

  // Setup view-specific handlers
  setupViewHandlers(viewName);
}

async function getViewContent(viewName) {
  switch (viewName) {
    case 'home':
      return getHomeView();
    case 'devices':
      return await getDevicesView();
    case 'applications':
      return await getApplicationsView();
    case 'security':
      return await getSecurityView();
    case 'networking':
      return await getNetworkingView();
    case 'storage':
      return await getStorageView();
    case 'processes':
      return getProcessesView();
    case 'activity':
      return getActivityView();
    case 'automation':
      return getAutomationView();
    case 'admin':
      return await getAdminView();
    case 'settings':
      return getSettingsView();
    default:
      return '<div class="empty-state"><p>View not found</p></div>';
  }
}

function getHomeView() {
  return `
    <div class="command-bar">
      <div class="command-input-wrapper">
        <input
          type="text"
          class="command-input"
          id="commandInput"
          placeholder="What would you like to do?"
          autocomplete="off"
        />
      </div>
      <div class="command-suggestions">
        <div class="suggestion-chip" data-cmd="show cpu usage">Show CPU usage</div>
        <div class="suggestion-chip" data-cmd="show memory usage">Show memory usage</div>
        <div class="suggestion-chip" data-cmd="show disk usage">Check storage</div>
        <div class="suggestion-chip" data-cmd="list processes">List processes</div>
        <div class="suggestion-chip" data-cmd="system info">System information</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">CPU</div>
        <div class="stat-value" id="cpuValue">--</div>
        <div class="stat-subtitle">Usage</div>
        <div class="stat-progress">
          <div class="stat-progress-fill healthy" id="cpuProgress" style="width: 0%"></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Memory</div>
        <div class="stat-value" id="memoryValue">--</div>
        <div class="stat-subtitle" id="memorySubtitle">Available</div>
        <div class="stat-progress">
          <div class="stat-progress-fill healthy" id="memoryProgress" style="width: 0%"></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Storage</div>
        <div class="stat-value" id="storageValue">--</div>
        <div class="stat-subtitle" id="storageSubtitle">Available</div>
        <div class="stat-progress">
          <div class="stat-progress-fill healthy" id="storageProgress" style="width: 0%"></div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Network</div>
        <div class="stat-value" id="networkValue">--</div>
        <div class="stat-subtitle">Status</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-title">Quick Actions</div>
      </div>
      <div class="actions-grid">
        <div class="action-card" data-action="cpu">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
          </svg>
          <div class="action-label">CPU</div>
        </div>
        <div class="action-card" data-action="memory">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
          </svg>
          <div class="action-label">Memory</div>
        </div>
        <div class="action-card" data-action="storage">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
          </svg>
          <div class="action-label">Storage</div>
        </div>
        <div class="action-card" data-action="network">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
          </svg>
          <div class="action-label">Network</div>
        </div>
        <div class="action-card" data-action="processes">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <div class="action-label">Processes</div>
        </div>
        <div class="action-card" data-action="updates">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <div class="action-label">Updates</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-title">Recent Activity</div>
        <div class="section-action" onclick="switchView('activity')">View All</div>
      </div>
      <div class="activity-list" id="activityList">
        <div class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <div class="empty-title">No recent activity</div>
          <div class="empty-desc">Run a command to get started</div>
        </div>
      </div>
    </div>
  `;
}

async function getDevicesView() {
  let deviceInfo = null;
  try {
    deviceInfo = await ipcRenderer.invoke('get-device-info');
  } catch (error) {
    console.error('Failed to load device info:', error);
  }

  if (!deviceInfo) {
    return `
      <div class="section">
        <div class="section-header">
          <div class="section-title">This Device</div>
        </div>
        <div class="empty-state">
          <div class="empty-title">Failed to load device information</div>
        </div>
      </div>
    `;
  }

  const formatBytes = (bytes) => {
    const gb = bytes / (1024 ** 3);
    return gb.toFixed(2) + ' GB';
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const platformLabels = {
    'darwin': 'macOS',
    'win32': 'Windows',
    'linux': 'Linux',
  };

  const platform = platformLabels[deviceInfo.platform] || deviceInfo.platform;

  return `
    <div class="section">
      <div class="section-header">
        <div class="section-title">This Device</div>
      </div>

      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-label">Hostname</div>
          <div class="stat-value" style="font-size: 1.25rem;">${deviceInfo.hostname}</div>
          <div class="stat-subtitle">${platform}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Processor</div>
          <div class="stat-value">${deviceInfo.cpuCount}</div>
          <div class="stat-subtitle">Cores</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Memory</div>
          <div class="stat-value">${formatBytes(deviceInfo.totalMemory)}</div>
          <div class="stat-subtitle">${deviceInfo.memoryUsagePercent}% used</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Uptime</div>
          <div class="stat-value">${formatUptime(deviceInfo.uptime)}</div>
          <div class="stat-subtitle">Running</div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-title">System Information</div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Device Name</strong></td>
                <td>${deviceInfo.hostname}</td>
              </tr>
              <tr>
                <td><strong>Platform</strong></td>
                <td>${platform} (${deviceInfo.arch})</td>
              </tr>
              <tr>
                <td><strong>OS Version</strong></td>
                <td>${deviceInfo.release}</td>
              </tr>
              <tr>
                <td><strong>OS Build</strong></td>
                <td>${deviceInfo.version}</td>
              </tr>
              <tr>
                <td><strong>CPU Model</strong></td>
                <td>${deviceInfo.cpuModel}</td>
              </tr>
              <tr>
                <td><strong>CPU Cores</strong></td>
                <td>${deviceInfo.cpuCount}</td>
              </tr>
              <tr>
                <td><strong>Total Memory</strong></td>
                <td>${formatBytes(deviceInfo.totalMemory)}</td>
              </tr>
              <tr>
                <td><strong>Used Memory</strong></td>
                <td>${formatBytes(deviceInfo.usedMemory)} (${deviceInfo.memoryUsagePercent}%)</td>
              </tr>
              <tr>
                <td><strong>Free Memory</strong></td>
                <td>${formatBytes(deviceInfo.freeMemory)}</td>
              </tr>
              <tr>
                <td><strong>System Uptime</strong></td>
                <td>${formatUptime(deviceInfo.uptime)}</td>
              </tr>
              <tr>
                <td><strong>User</strong></td>
                <td>${deviceInfo.userInfo.username}</td>
              </tr>
              <tr>
                <td><strong>Home Directory</strong></td>
                <td>${deviceInfo.homeDir}</td>
              </tr>
              <tr>
                <td><strong>Temp Directory</strong></td>
                <td>${deviceInfo.tmpDir}</td>
              </tr>
              <tr>
                <td><strong>Network Interfaces</strong></td>
                <td>${deviceInfo.networkInterfaces.join(', ')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-title">CPU Details</div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Core</th>
                <th>Model</th>
                <th>Speed (MHz)</th>
              </tr>
            </thead>
            <tbody>
              ${deviceInfo.cpus.map((cpu, idx) => `
                <tr>
                  <td>Core ${idx + 1}</td>
                  <td>${cpu.model}</td>
                  <td>${cpu.speed}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="section" id="remoteDevicesSection">
      <div class="section-header">
        <div class="section-title">Remote Devices</div>
        <button class="action-btn" onclick="refreshRemoteDevices()" style="margin-left: auto;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>
      <div id="remoteDevicesList">
        <div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.5);">
          Loading remote devices...
        </div>
      </div>
    </div>
  `;
}

function getProcessesView() {
  return `
    <div class="section">
      <div class="section-header">
        <div class="section-title">Running Processes</div>
        <button class="btn-primary" onclick="runCommand('list processes')">Refresh</button>
      </div>
      <div class="empty-state">
        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <div class="empty-title">Process monitoring</div>
        <div class="empty-desc">Click Refresh to view running processes</div>
      </div>
    </div>
  `;
}

function getActivityView() {
  const sorted = activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!activities.length) {
    return `
      <div class="empty-state">
        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <div class="empty-title">No activity yet</div>
        <div class="empty-desc">Actions performed will appear here</div>
      </div>
    `;
  }

  const items = sorted.map(activity => {
    const status = activity.status || 'pending';
    const badgeClass = status === 'completed' ? 'completed' : status === 'running' ? 'running' : 'failed';
    const timeAgo = formatTimeAgo(new Date(activity.createdAt));

    return `
      <div class="activity-item" onclick="toggleActivity(this)">
        <div class="activity-header">
          <div class="activity-title">${escapeHtml(activity.reasoning || activity.capabilityId)}</div>
          <div class="activity-badge ${badgeClass}">${status}</div>
        </div>
        <div class="activity-desc">${escapeHtml(activity.capabilityId)}</div>
        <div class="activity-meta">${timeAgo}</div>
        <div class="activity-details">
          <div class="detail-section">
            <div class="detail-label">Parameters</div>
            <div class="detail-content"><pre>${JSON.stringify(activity.parameters, null, 2)}</pre></div>
          </div>
          ${activity.result ? `
          <div class="detail-section">
            <div class="detail-label">Result</div>
            <div class="detail-content"><pre>${JSON.stringify(activity.result.result || activity.result.error || activity.result, null, 2)}</pre></div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="section">
      <div class="section-header">
        <div class="section-title">All Activity</div>
      </div>
      <div class="activity-list">${items}</div>
    </div>
  `;
}

function getAutomationView() {
  const rules = JSON.parse(localStorage.getItem('automationRules') || '[]');

  if (rules.length === 0) {
    return `
      <div class="section">
        <div class="section-header">
          <div class="section-title">Automation Rules</div>
          <button class="btn-primary" onclick="showCreateAutomationRule()">Create Rule</button>
        </div>
        <div class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <div class="empty-title">No automation rules</div>
          <div class="empty-desc">Create rules to automate common tasks and save time</div>
          <button class="btn-primary" style="margin-top: 1rem;" onclick="showCreateAutomationRule()">Create Your First Rule</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="section">
      <div class="section-header">
        <div class="section-title">Automation Rules (${rules.length})</div>
        <button class="btn-primary" onclick="showCreateAutomationRule()">Create Rule</button>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Rule Name</th>
              <th>Trigger</th>
              <th>Action</th>
              <th>Status</th>
              <th>Runs</th>
              <th>Last Run</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rules.map(rule => `
              <tr>
                <td style="font-weight: 600;">
                  ${rule.name}
                  ${rule.description ? `<div style="font-size: 0.75rem; color: #737373; font-weight: 400;">${rule.description}</div>` : ''}
                </td>
                <td>
                  <span class="activity-badge ${rule.trigger === 'schedule' ? 'completed' : rule.trigger === 'event' ? 'running' : 'pending'}">
                    ${rule.trigger === 'schedule' ? 'Schedule' : rule.trigger === 'event' ? 'Event' : 'Condition'}
                  </span>
                </td>
                <td style="font-family: monospace; font-size: 0.875rem;">${rule.action}</td>
                <td>
                  <label class="toggle-switch" onclick="toggleAutomationRule('${rule.id}')">
                    <input type="checkbox" ${rule.enabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                </td>
                <td>${rule.runCount || 0}</td>
                <td>${rule.lastRun ? new Date(rule.lastRun).toLocaleString() : 'Never'}</td>
                <td>
                  <button class="btn-sm" onclick="runAutomationRule('${rule.id}')" style="margin-right: 0.5rem;">Run Now</button>
                  <button class="btn-sm" onclick="editAutomationRule('${rule.id}')">Edit</button>
                  <button class="btn-sm btn-danger" onclick="deleteAutomationRule('${rule.id}', '${rule.name.replace(/'/g, "\\'")}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function getAdminView() {
  const role = userSession?.role || 'member';
  const tenantType = userSession?.tenantType || 'home';
  const tenantName = userSession?.tenantName || 'Personal';
  const isPlatformAdmin = role === 'platform_admin';
  const isAdmin = isPlatformAdmin || role === 'owner' || role === 'admin';

  let accountTypeLabel;
  let accountSubtitle;

  if (isPlatformAdmin) {
    accountTypeLabel = 'All Access';
    accountSubtitle = 'Personal • Business • Enterprise';
  } else {
    accountTypeLabel = tenantType === 'business' ? 'Business' :
                       tenantType === 'enterprise' ? 'Enterprise' : 'Personal';
    accountSubtitle = tenantName;
  }

  const roleLabel = isPlatformAdmin ? 'Platform Admin' :
                    role === 'owner' ? 'Owner (Full Access)' :
                    role === 'admin' ? 'Administrator' :
                    role === 'member' ? 'Member' : 'User';

  const accessLevel = isPlatformAdmin ? 'Platform-wide access' :
                      isAdmin ? 'Full access' : 'Limited access';

  // Load admin data if platform admin
  let stats = null;
  let users = [];
  let organizations = [];

  if (isPlatformAdmin) {
    try {
      stats = await ipcRenderer.invoke('admin-get-stats');
      const usersData = await ipcRenderer.invoke('admin-get-users');
      const orgsData = await ipcRenderer.invoke('admin-get-organizations');
      users = usersData.users || [];
      organizations = orgsData.organizations || [];
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  }

  return `
    <div class="section">
      <div class="section-header">
        <div class="section-title">Admin Console</div>
      </div>

      ${isPlatformAdmin ? `
      <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <svg width="24" height="24" fill="none" stroke="#3B82F6" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <div>
            <div style="font-size: 0.875rem; font-weight: 600; color: #3B82F6; margin-bottom: 0.25rem;">Platform Administrator</div>
            <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7);">You have unrestricted access to all account types and features</div>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="stats-grid" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-label">${isPlatformAdmin ? 'Total Users' : 'Account Access'}</div>
          <div class="stat-value">${isPlatformAdmin && stats ? stats.totalUsers : accountTypeLabel}</div>
          <div class="stat-subtitle">${isPlatformAdmin ? 'Platform-wide' : accountSubtitle}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${isPlatformAdmin ? 'Organizations' : 'Your Role'}</div>
          <div class="stat-value">${isPlatformAdmin && stats ? stats.totalOrganizations : roleLabel.split(' ')[0]}</div>
          <div class="stat-subtitle">${isPlatformAdmin ? 'All account types' : accessLevel}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${isPlatformAdmin ? 'Personal' : 'Devices'}</div>
          <div class="stat-value">${isPlatformAdmin && stats ? stats.accountTypes.home : '1'}</div>
          <div class="stat-subtitle">${isPlatformAdmin ? 'Accounts' : 'Managed'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">${isPlatformAdmin ? 'Business' : 'Features'}</div>
          <div class="stat-value">${isPlatformAdmin && stats ? stats.accountTypes.business + stats.accountTypes.enterprise : (isPlatformAdmin ? 'All' : tenantType === 'home' ? 'Basic' : 'Pro')}</div>
          <div class="stat-subtitle">${isPlatformAdmin ? 'Accounts' : (isPlatformAdmin ? 'Unlimited' : 'Plan')}</div>
        </div>
      </div>

      ${isPlatformAdmin && users.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <div class="section-title">All Users (${users.length})</div>
          <button class="btn-primary" onclick="showCreateUserModal()">Create User</button>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Organization</th>
                <th>Account Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(user => `
                <tr onclick="showUserDetails('${user.id}')" style="cursor: pointer;">
                  <td style="font-weight: 600;">${user.username}</td>
                  <td>${user.email || 'N/A'}</td>
                  <td><span class="activity-badge ${user.role === 'platform_admin' ? 'running' : 'completed'}">${user.role}</span></td>
                  <td>${user.tenant?.name || 'N/A'}</td>
                  <td>${user.tenant?.type || 'N/A'}</td>
                  <td><span class="activity-badge ${user.emailVerified ? 'completed' : 'failed'}">${user.emailVerified ? 'Verified' : 'Unverified'}</span></td>
                  <td onclick="event.stopPropagation();">
                    <button class="btn-sm" onclick="showUserDetails('${user.id}')" style="margin-right: 0.5rem;">View Details</button>
                    <button class="btn-sm btn-danger" onclick="deleteUser('${user.id}', '${user.username}')">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      ${isPlatformAdmin && organizations.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <div class="section-title">All Organizations (${organizations.length})</div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Users</th>
                <th>Blocked Capabilities</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${organizations.map(org => `
                <tr onclick="showOrganizationDetails('${org.id}')" style="cursor: pointer;">
                  <td style="font-weight: 600;">${org.name}</td>
                  <td><span class="activity-badge completed">${org.type}</span></td>
                  <td>${org.userCount}</td>
                  <td>${org.blockedCapabilities.length}</td>
                  <td>${new Date(org.createdAt).toLocaleDateString()}</td>
                  <td onclick="event.stopPropagation();">
                    <button class="btn-sm" onclick="showOrganizationDetails('${org.id}')" style="margin-right: 0.5rem;">View Details</button>
                    <button class="btn-sm btn-danger" onclick="deleteOrganization('${org.id}', '${org.name}')">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      ${!isPlatformAdmin ? `
      <div class="section">
        <div class="section-header">
          <div class="section-title">Account Management</div>
        </div>
        <div class="actions-grid">
          <div class="action-card" onclick="showToast('User management - View and manage account users', 'info')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <div class="action-label">User Management</div>
          </div>
          <div class="action-card" onclick="showToast('Organization settings - Manage your organization', 'info')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            <div class="action-label">Organization</div>
          </div>
          <div class="action-card" onclick="showToast('Permissions - Configure user and role permissions', 'info')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <div class="action-label">Permissions</div>
          </div>
          <div class="action-card" onclick="showToast('Billing & Subscription - Manage payment and plans', 'info')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
            <div class="action-label">Billing</div>
          </div>
          <div class="action-card" onclick="switchView('settings')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
            </svg>
            <div class="action-label">Settings</div>
          </div>
          <div class="action-card" onclick="switchView('activity')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <div class="action-label">Audit Logs</div>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-header">
          <div class="section-title">Upgrade to Business</div>
        </div>
        <div class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
          <div class="empty-title">Unlock enterprise features</div>
          <div class="empty-desc">Multi-user management, custom domains, SSO, and more</div>
          <button class="btn-primary" style="margin-top: 1rem;" onclick="showToast('Contact sales for enterprise features: sales@comandr.com', 'info')">Learn More</button>
        </div>
      </div>
    </div>
  `;
}

function setupViewHandlers(viewName) {
  if (viewName === 'home') {
    // Command input
    const commandInput = document.getElementById('commandInput');
    if (commandInput) {
      commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
          runCommand(e.target.value);
          e.target.value = '';
        }
      });
    }

    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        commandInput.value = chip.dataset.cmd;
        commandInput.focus();
      });
    });

    // Action cards
    document.querySelectorAll('.action-card').forEach(card => {
      card.addEventListener('click', () => {
        const actionCommands = {
          cpu: 'show cpu usage',
          memory: 'show memory usage',
          storage: 'show disk usage',
          network: 'show network info',
          processes: 'list processes',
          updates: 'check for updates'
        };
        const cmd = actionCommands[card.dataset.action];
        if (cmd) runCommand(cmd);
      });
    });

    // Load system stats
    loadSystemStats();

    // Render activities on home
    renderHomeActivities();
  }

  if (viewName === 'devices') {
    // Load remote devices
    loadRemoteDevices();
  }
}

async function runCommand(cmd) {
  try {
    // Show immediate feedback
    showToast(`Running: ${cmd}`, 'info');

    await ipcRenderer.invoke('send-command', cmd);

    // Poll for results for up to 10 seconds
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds total

    const checkResult = async () => {
      await loadActivities();

      if (currentView === 'home') {
        renderHomeActivities();
      } else if (currentView === 'activity') {
        switchView('activity');
      }

      // Check if latest activity has result
      const latest = activities[0];
      if (latest && latest.status === 'completed' && latest.result) {
        showCommandResultPopup(latest);
        return;
      }

      if (latest && latest.status === 'failed') {
        showCommandResultPopup(latest);
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkResult, 500);
      }
    };

    setTimeout(checkResult, 500);
  } catch (error) {
    console.error('Command failed:', error);
    showToast(`Error: ${error.message}`, 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showCommandResultPopup(activity) {
  const result = activity.result?.result || activity.result;
  const capabilityId = activity.capabilityId || '';
  const status = activity.status;

  // Format result as English explanation
  let explanation = '';
  let icon = '';

  if (status === 'failed') {
    icon = '❌';
    explanation = `Command failed: ${activity.result?.error || 'Unknown error'}`;
  } else {
    icon = '✅';
    explanation = formatResultAsEnglish(capabilityId, result);
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '600px';

  const resultId = 'result-' + Date.now();

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${icon} ${status === 'failed' ? 'Command Failed' : 'Command Completed'}</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div style="font-size: 1rem; line-height: 1.6; margin-bottom: 1.5rem; color: rgba(255,255,255,0.9);">
          ${explanation}
        </div>
        <div id="${resultId}" style="display: none;">
          <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(255,255,255,0.5); margin-bottom: 0.5rem;">Raw Data</div>
          <pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 0.5rem; font-size: 0.875rem; overflow-x: auto; max-height: 300px; overflow-y: auto;">${JSON.stringify(result, null, 2)}</pre>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; gap: 0.75rem;">
        <button class="btn-secondary" onclick="toggleResultView('${resultId}')">
          <span id="${resultId}-toggle">Show Raw Data</span>
        </button>
        <button class="btn-primary" onclick="closeModal(this)">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function formatResultAsEnglish(capabilityId, result) {
  if (!result) return 'Command completed successfully.';

  // Memory usage
  if (capabilityId === 'system.memory.usage') {
    return `<strong>Memory Status:</strong><br>
      • Total: ${result.total}<br>
      • Used: ${result.used} (${result.usagePercent})<br>
      • Free: ${result.free}`;
  }

  // CPU usage
  if (capabilityId === 'system.cpu.usage') {
    if (result.cpus && Array.isArray(result.cpus)) {
      const avgUsage = result.cpus.reduce((sum, cpu) => sum + parseFloat(cpu.usage || 0), 0) / result.cpus.length;
      return `<strong>CPU Status:</strong><br>
        • Cores: ${result.count}<br>
        • Average Usage: ${avgUsage.toFixed(1)}%<br>
        • Model: ${result.cpus[0]?.model || 'Unknown'}`;
    }
  }

  // Disk usage
  if (capabilityId === 'system.disk.usage') {
    if (Array.isArray(result) && result.length > 0) {
      return `<strong>Disk Usage:</strong><br>` + result.map(disk =>
        `• ${disk.mounted || disk.drive}: ${disk.used || 'N/A'} used of ${disk.size || disk.total}`
      ).join('<br>');
    }
  }

  // Process list
  if (capabilityId === 'process.list') {
    if (Array.isArray(result)) {
      return `<strong>Process List:</strong><br>
        • Total processes: ${result.length}<br>
        • Click "Show Raw Data" to see full list`;
    }
  }

  // Application list
  if (capabilityId === 'app.list') {
    if (Array.isArray(result)) {
      return `<strong>Applications Found:</strong><br>
        • Total apps: ${result.length}<br>
        • Click "Show Raw Data" to see full list`;
    }
  }

  // Network interfaces
  if (capabilityId === 'system.network.interfaces') {
    if (Array.isArray(result)) {
      return `<strong>Network Interfaces:</strong><br>` + result.slice(0, 3).map(iface =>
        `• ${iface.name}: ${iface.addresses?.find(a => a.family === 'IPv4')?.address || 'No IPv4'}`
      ).join('<br>') + (result.length > 3 ? `<br>• ...and ${result.length - 3} more` : '');
    }
  }

  // Ping
  if (capabilityId === 'network.ping') {
    return `<strong>Ping Result:</strong><br>
      • Host: ${result.host}<br>
      • Status: ${result.reachable ? '✅ Reachable' : '❌ Unreachable'}`;
  }

  // DNS lookup
  if (capabilityId === 'network.dns_lookup') {
    return `<strong>DNS Lookup:</strong><br>
      • Hostname: ${result.hostname}<br>
      • Result: ${result.result || 'No results'}`;
  }

  // Port check
  if (capabilityId === 'network.port_check') {
    return `<strong>Port Check:</strong><br>
      • Host: ${result.host}<br>
      • Port: ${result.port}<br>
      • Status: ${result.open ? '✅ Open' : '❌ Closed'}`;
  }

  // Storage management
  if (capabilityId === 'system.storage.clean_temp') {
    return `<strong>Temp Files Cleaned:</strong><br>
      • ${result.success ? '✅ Successfully cleaned temporary files' : '❌ Failed to clean files'}<br>
      • ${result.message || 'Operation completed'}${result.errors && result.errors.length > 0 ? '<br>• Some errors occurred (check console)' : ''}`;
  }

  if (capabilityId === 'system.storage.empty_trash') {
    return `<strong>Trash Emptied:</strong><br>
      • ${result.success ? '✅ Trash emptied successfully' : '❌ Failed to empty trash'}<br>
      • ${result.message || 'Operation completed'}`;
  }

  if (capabilityId === 'system.storage.find_large_files') {
    if (result.files && Array.isArray(result.files)) {
      return `<strong>Large Files Found:</strong><br>
        • Total: ${result.count || result.files.length} files<br>
        • ${result.message || `Files larger than ${result.minSize || 100}MB`}<br>
        • Click "Show Raw Data" to see file list`;
    }
  }

  if (capabilityId === 'system.storage.analyze_usage') {
    return `<strong>Storage Analysis:</strong><br>
      • ${result.success ? 'Analysis complete' : 'Analysis failed'}<br>
      • ${result.message || 'Click "Show Raw Data" to see details'}`;
  }

  // Security
  if (capabilityId === 'security.firewall.enable') {
    return `<strong>Firewall Status:</strong><br>
      • ${result.success ? '✅ Firewall enabled successfully' : '❌ Failed to enable firewall'}<br>
      • ${result.message || 'Operation completed'}`;
  }

  if (capabilityId === 'security.scan.malware') {
    return `<strong>Malware Scan:</strong><br>
      • ${result.success ? '✅ Scan completed' : '❌ Scan failed'}<br>
      • ${result.message || 'No threats detected'}<br>
      • Click "Show Raw Data" to see scan details`;
  }

  if (capabilityId === 'system.updates.check') {
    return `<strong>System Updates:</strong><br>
      • ${result.success ? (result.hasUpdates ? '📦 Updates available' : '✅ System is up to date') : '❌ Failed to check for updates'}<br>
      • ${result.message || 'Check complete'}${result.hasUpdates ? '<br>• Click "Show Raw Data" to see available updates' : ''}`;
  }

  if (capabilityId === 'security.logs.view') {
    return `<strong>Security Logs:</strong><br>
      • ${result.success ? '✅ Logs retrieved successfully' : '❌ Failed to retrieve logs'}<br>
      • ${result.message || 'Click "Show Raw Data" to see logs'}`;
  }

  // Generic success with properties
  if (typeof result === 'object') {
    const keys = Object.keys(result);
    if (keys.length === 0) return 'Command completed with empty result.';
    if (keys.length <= 5) {
      return '<strong>Result:</strong><br>' + keys.map(key =>
        `• ${key}: ${typeof result[key] === 'object' ? JSON.stringify(result[key]) : result[key]}`
      ).join('<br>');
    }
    return `<strong>Command completed successfully.</strong><br>Result contains ${keys.length} properties. Click "Show Raw Data" to see details.`;
  }

  return `Command completed: ${result}`;
}

function toggleResultView(resultId) {
  const element = document.getElementById(resultId);
  const toggle = document.getElementById(resultId + '-toggle');
  if (element.style.display === 'none') {
    element.style.display = 'block';
    toggle.textContent = 'Hide Raw Data';
  } else {
    element.style.display = 'none';
    toggle.textContent = 'Show Raw Data';
  }
}

function loadSystemStats() {
  // Placeholder stats - these would come from system calls
  document.getElementById('cpuValue').textContent = '24%';
  document.getElementById('cpuProgress').style.width = '24%';

  document.getElementById('memoryValue').textContent = '8.2 GB';
  document.getElementById('memorySubtitle').textContent = 'of 16 GB used';
  document.getElementById('memoryProgress').style.width = '51%';

  document.getElementById('storageValue').textContent = '128 GB';
  document.getElementById('storageSubtitle').textContent = 'of 512 GB free';
  document.getElementById('storageProgress').style.width = '75%';

  document.getElementById('networkValue').textContent = 'Wi-Fi';
}

function renderHomeActivities() {
  const activityList = document.getElementById('activityList');
  if (!activityList) return;

  if (!activities.length) {
    activityList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <div class="empty-title">No recent activity</div>
        <div class="empty-desc">Run a command to get started</div>
      </div>
    `;
    return;
  }

  const sorted = activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recent = sorted.slice(0, 5);

  activityList.innerHTML = recent.map(activity => {
    const status = activity.status || 'pending';
    const badgeClass = status === 'completed' ? 'completed' : status === 'running' ? 'running' : 'failed';
    const timeAgo = formatTimeAgo(new Date(activity.createdAt));

    return `
      <div class="activity-item" onclick="toggleActivity(this)">
        <div class="activity-header">
          <div class="activity-title">${escapeHtml(activity.reasoning || activity.capabilityId)}</div>
          <div class="activity-badge ${badgeClass}">${status}</div>
        </div>
        <div class="activity-desc">${escapeHtml(activity.capabilityId)}</div>
        <div class="activity-meta">${timeAgo} • Click to see ${activity.result ? 'result' : 'details'}</div>
        <div class="activity-details">
          <div class="detail-section">
            <div class="detail-label">Parameters</div>
            <div class="detail-content"><pre>${JSON.stringify(activity.parameters || {}, null, 2)}</pre></div>
          </div>
          ${activity.result ? `
          <div class="detail-section">
            <div class="detail-label">Result</div>
            <div class="detail-content"><pre>${JSON.stringify(activity.result.result || activity.result.error || activity.result, null, 2)}</pre></div>
          </div>
          ` : (status === 'failed' ? `
          <div class="detail-section">
            <div class="detail-label">Error</div>
            <div class="detail-content"><pre>Command failed - check logs for details</pre></div>
          </div>
          ` : `
          <div class="detail-section">
            <div class="detail-label">Status</div>
            <div class="detail-content"><pre>Waiting for agent to execute...</pre></div>
          </div>
          `)}
        </div>
      </div>
    `;
  }).join('');
}

function toggleActivity(element) {
  element.classList.toggle('expanded');
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions available globally for onclick handlers
window.switchView = switchView;
window.toggleActivity = toggleActivity;
window.runCommand = runCommand;

// ===== Admin Management Functions =====

async function showCreateUserModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create New User</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="newUsername" class="form-input" placeholder="Enter username" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="newEmail" class="form-input" placeholder="user@example.com" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="newPassword" class="form-input" placeholder="Enter password" />
        </div>
        <div class="form-group">
          <label>Role</label>
          <select id="newRole" class="form-input">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
            <option value="platform_admin">Platform Admin</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="createUser()">Create User</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function createUser() {
  const username = document.getElementById('newUsername').value;
  const email = document.getElementById('newEmail').value;
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newRole').value;

  if (!username || !email || !password) {
    alert('Please fill in all fields');
    return;
  }

  try {
    await ipcRenderer.invoke('admin-create-user', { username, email, password, role });
    alert('User created successfully!');
    closeModal(document.querySelector('.modal'));
    switchView('admin'); // Refresh the view
  } catch (error) {
    alert('Failed to create user: ' + error.message);
  }
}

async function editUser(user) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit User: ${user.username}</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="editUsername" class="form-input" value="${user.username}" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="editEmail" class="form-input" value="${user.email || ''}" />
        </div>
        <div class="form-group">
          <label>Role</label>
          <select id="editRole" class="form-input">
            <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="owner" ${user.role === 'owner' ? 'selected' : ''}>Owner</option>
            <option value="platform_admin" ${user.role === 'platform_admin' ? 'selected' : ''}>Platform Admin</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="saveUser('${user.id}')">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveUser(userId) {
  const username = document.getElementById('editUsername').value;
  const email = document.getElementById('editEmail').value;
  const role = document.getElementById('editRole').value;

  try {
    await ipcRenderer.invoke('admin-update-user', userId, { username, email, role });
    alert('User updated successfully!');
    closeModal(document.querySelector('.modal'));
    switchView('admin'); // Refresh the view
  } catch (error) {
    alert('Failed to update user: ' + error.message);
  }
}

async function deleteUser(userId, username) {
  if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
    return;
  }

  try {
    await ipcRenderer.invoke('admin-delete-user', userId);
    alert('User deleted successfully!');
    switchView('admin'); // Refresh the view
  } catch (error) {
    alert('Failed to delete user: ' + error.message);
  }
}

async function editOrganization(org) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Organization: ${org.name}</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Organization Name</label>
          <input type="text" id="editOrgName" class="form-input" value="${org.name}" />
        </div>
        <div class="form-group">
          <label>Account Type</label>
          <select id="editOrgType" class="form-input">
            <option value="home" ${org.type === 'home' ? 'selected' : ''}>Personal</option>
            <option value="business" ${org.type === 'business' ? 'selected' : ''}>Business</option>
            <option value="enterprise" ${org.type === 'enterprise' ? 'selected' : ''}>Enterprise</option>
            <option value="msp" ${org.type === 'msp' ? 'selected' : ''}>MSP</option>
            <option value="msp_client" ${org.type === 'msp_client' ? 'selected' : ''}>MSP Client</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="saveOrganization('${org.id}')">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveOrganization(orgId) {
  const name = document.getElementById('editOrgName').value;
  const type = document.getElementById('editOrgType').value;

  try {
    await ipcRenderer.invoke('admin-update-organization', orgId, { name, type });
    alert('Organization updated successfully!');
    closeModal(document.querySelector('.modal'));
    switchView('admin'); // Refresh the view
  } catch (error) {
    alert('Failed to update organization: ' + error.message);
  }
}

async function deleteOrganization(orgId, orgName) {
  if (!confirm(`Are you sure you want to delete organization "${orgName}"? This will fail if there are users in this organization.`)) {
    return;
  }

  try {
    await ipcRenderer.invoke('admin-delete-organization', orgId);
    alert('Organization deleted successfully!');
    switchView('admin'); // Refresh the view
  } catch (error) {
    alert('Failed to delete organization: ' + error.message);
  }
}

function closeModal(element) {
  const modal = element.closest('.modal');
  if (modal) {
    modal.remove();
  }
}

// Make admin functions globally available
window.showCreateUserModal = showCreateUserModal;
window.createUser = createUser;
window.editUser = editUser;
window.saveUser = saveUser;
window.deleteUser = deleteUser;
window.editOrganization = editOrganization;
window.saveOrganization = saveOrganization;
window.deleteOrganization = deleteOrganization;
window.closeModal = closeModal;

// ===== Settings View =====
async function getSettingsView() {
  const role = userSession?.role || 'member';
  const isPlatformAdmin = role === 'platform_admin';

  // Fetch current user details
  let currentUser = null;
  try {
    const usersData = await ipcRenderer.invoke('admin-get-users');
    currentUser = usersData.users?.find(u => u.id === userSession.userId);
  } catch (error) {
    console.error('Failed to load user details:', error);
  }

  const username = currentUser?.username || 'N/A';
  const email = currentUser?.contactEmail || currentUser?.email || 'N/A';
  const fullName = currentUser?.fullName || 'Not set';

  return `
    <div class="section">
      <div class="section-header">
        <div class="section-title">Settings</div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-title">Account Information</div>
        </div>
        <div class="table-container">
          <table>
            <tbody>
              <tr>
                <td style="width: 200px;"><strong>Username</strong></td>
                <td>${username}</td>
                <td><button class="btn-sm" onclick="editMyUsername('${username}')">Change</button></td>
              </tr>
              <tr>
                <td><strong>Email</strong></td>
                <td>${email}</td>
                <td><button class="btn-sm" onclick="editMyEmail('${email}')">Change</button></td>
              </tr>
              <tr>
                <td><strong>Full Name</strong></td>
                <td>${fullName}</td>
                <td><button class="btn-sm" onclick="editMyFullName('${fullName}')">Change</button></td>
              </tr>
              <tr>
                <td><strong>Password</strong></td>
                <td>••••••••</td>
                <td><button class="btn-sm" onclick="editMyPassword()">Change</button></td>
              </tr>
              <tr>
                <td><strong>User ID</strong></td>
                <td>${userSession?.userId?.slice(0, 16) || 'N/A'}...</td>
                <td></td>
              </tr>
              <tr>
                <td><strong>Role</strong></td>
                <td>${role}</td>
                <td></td>
              </tr>
              <tr>
                <td><strong>Account Type</strong></td>
                <td>${userSession?.tenantType || 'N/A'}</td>
                <td></td>
              </tr>
              <tr>
                <td><strong>Organization</strong></td>
                <td>${userSession?.tenantName || 'N/A'}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-title">Preferences</div>
        </div>
        <div class="actions-grid">
          <div class="action-card" onclick="showToast('Notification settings - Configure alerts and notifications', 'info')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <div class="action-label">Notifications</div>
          </div>
          <div class="action-card" onclick="runCommand('check for updates')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <div class="action-label">Auto-Update</div>
          </div>
          <div class="action-card" onclick="switchView('security')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <div class="action-label">Security</div>
          </div>
          <div class="action-card" onclick="clearCache()">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            <div class="action-label">Clear Cache</div>
          </div>
        </div>
      </div>

      ${isPlatformAdmin ? `
      <div class="section">
        <div class="section-header">
          <div class="section-title">Platform Administration</div>
        </div>
        <div class="actions-grid">
          <div class="action-card" onclick="switchView('admin')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <div class="action-label">Admin Console</div>
          </div>
          <div class="action-card" onclick="switchView('activity')">
            <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <div class="action-label">System Logs</div>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-header">
          <div class="section-title">About</div>
        </div>
        <div style="padding: 1rem; background: #171717; border-radius: 10px; border: 1px solid #2B2B2B;">
          <div style="font-size: 0.875rem; color: #E5E5E5; margin-bottom: 0.5rem;"><strong>Comandr Desktop</strong></div>
          <div style="font-size: 0.75rem; color: #737373;">Version 1.0.0</div>
          <div style="font-size: 0.75rem; color: #737373; margin-top: 0.5rem;">© 2026 Comandr. All rights reserved.</div>
        </div>
      </div>
    </div>
  `;
}

async function clearCache() {
  if (confirm('Are you sure you want to clear the cache? This will log you out.')) {
    await ipcRenderer.invoke('logout');
  }
}

// ===== Personal Info Editing =====
async function editMyUsername(currentValue) {
  const newUsername = prompt('Enter new username:', currentValue || '');
  if (!newUsername || newUsername === currentValue) return;

  try {
    await ipcRenderer.invoke('admin-update-user', userSession.userId, { username: newUsername });
    showToast(`Username updated to "${newUsername}"`, 'success');
    switchView('settings');
  } catch (error) {
    showToast('Failed to update username: ' + error.message, 'error');
  }
}

async function editMyEmail(currentValue) {
  const newEmail = prompt('Enter new email:', currentValue || '');
  if (!newEmail || newEmail === currentValue) return;

  if (!newEmail.includes('@')) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  try {
    await ipcRenderer.invoke('admin-update-user', userSession.userId, { contactEmail: newEmail });
    showToast(`Email updated to "${newEmail}"`, 'success');
    switchView('settings');
  } catch (error) {
    showToast('Failed to update email: ' + error.message, 'error');
  }
}

async function editMyFullName(currentValue) {
  const newName = prompt('Enter your full name:', currentValue === 'Not set' ? '' : currentValue);
  if (!newName || newName === currentValue) return;

  try {
    await ipcRenderer.invoke('admin-update-user', userSession.userId, { fullName: newName });
    showToast(`Full name updated to "${newName}"`, 'success');
    switchView('settings');
  } catch (error) {
    showToast('Failed to update full name: ' + error.message, 'error');
  }
}

async function editMyPassword() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Change Password</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500;">Current Password</label>
          <input type="password" id="currentPassword" class="form-input" placeholder="Enter current password" style="width: 100%; padding: 0.75rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: white;" />
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500;">New Password</label>
          <input type="password" id="newPassword" class="form-input" placeholder="Enter new password" style="width: 100%; padding: 0.75rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: white;" />
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500;">Confirm New Password</label>
          <input type="password" id="confirmPassword" class="form-input" placeholder="Confirm new password" style="width: 100%; padding: 0.75rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; color: white;" />
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="saveMyPassword()">Change Password</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveMyPassword() {
  const current = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;

  if (!current || !newPass || !confirm) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  if (newPass !== confirm) {
    showToast('New passwords do not match', 'error');
    return;
  }

  if (newPass.length < 8) {
    showToast('Password must be at least 8 characters', 'error');
    return;
  }

  try {
    // In a real implementation, this would verify the current password
    // and update to the new one via a secure endpoint
    await ipcRenderer.invoke('admin-update-user', userSession.userId, { password: newPass });
    showToast('Password changed successfully', 'success');
    closeModal(document.querySelector('.modal'));
  } catch (error) {
    showToast('Failed to change password: ' + error.message, 'error');
  }
}

// ===== Storage View with Actions =====
async function getStorageView() {
  let diskInfo = null;
  try {
    diskInfo = await ipcRenderer.invoke('get-disk-info');
  } catch (error) {
    console.error('Failed to load disk info:', error);
  }

  const formatBytes = (bytes) => {
    const gb = bytes / (1024 ** 3);
    return gb.toFixed(2) + ' GB';
  };

  if (!diskInfo) {
    return `
      <div class="section">
        <div class="section-header">
          <div class="section-title">Storage</div>
        </div>
        <div class="empty-state">
          <div class="empty-title">Failed to load storage information</div>
        </div>
      </div>
    `;
  }

  const usedPercent = diskInfo.used && diskInfo.total ? Math.round((diskInfo.used / diskInfo.total) * 100) : 0;
  const available = diskInfo.total && diskInfo.used ? diskInfo.total - diskInfo.used : 0;

  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total</div>
        <div class="stat-value">${formatBytes(diskInfo.total || 0)}</div>
        <div class="stat-subtitle">Capacity</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Used</div>
        <div class="stat-value">${formatBytes(diskInfo.used || 0)}</div>
        <div class="stat-subtitle">${usedPercent}% of capacity</div>
        <div class="stat-progress">
          <div class="stat-progress-fill ${usedPercent > 80 ? 'critical' : usedPercent > 60 ? 'warning' : 'healthy'}" style="width: ${usedPercent}%"></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Available</div>
        <div class="stat-value">${formatBytes(available)}</div>
        <div class="stat-subtitle">Free space</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Filesystem</div>
        <div class="stat-value">${diskInfo.filesystem || 'N/A'}</div>
        <div class="stat-subtitle">Mount: ${diskInfo.mountPoint || '/'}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-title">Storage Management</div>
      </div>
      <div class="actions-grid">
        <div class="action-card" onclick="runCommand('clean temporary files')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          <div class="action-label">Clean Temp Files</div>
        </div>
        <div class="action-card" onclick="runCommand('empty trash')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          <div class="action-label">Empty Trash</div>
        </div>
        <div class="action-card" onclick="runCommand('show large files')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <div class="action-label">Find Large Files</div>
        </div>
        <div class="action-card" onclick="runCommand('analyze disk usage')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <div class="action-label">Analyze Usage</div>
        </div>
      </div>
    </div>
  `;
}

// ===== Networking View with Actions =====
async function getNetworkingView() {
  let networkInfo = null;
  try {
    networkInfo = await ipcRenderer.invoke('get-network-info');
  } catch (error) {
    console.error('Failed to load network info:', error);
  }

  // Find the first non-internal interface with an IPv4 address
  const activeInterface = networkInfo && networkInfo.length > 0
    ? networkInfo.find(iface => !iface.internal && iface.family === 'IPv4') || networkInfo[0]
    : null;
  const ipAddress = activeInterface?.address || '--';

  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Connection</div>
        <div class="stat-value">${activeInterface ? activeInterface.name : 'N/A'}</div>
        <div class="stat-subtitle">Active Interface</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">IP Address</div>
        <div class="stat-value">${ipAddress}</div>
        <div class="stat-subtitle">Local</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">MAC Address</div>
        <div class="stat-value">${activeInterface?.mac || 'N/A'}</div>
        <div class="stat-subtitle">Hardware</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Interfaces</div>
        <div class="stat-value">${networkInfo?.length || 0}</div>
        <div class="stat-subtitle">Total</div>
      </div>
    </div>

    ${networkInfo && networkInfo.length > 0 ? `
    <div class="section">
      <div class="section-header">
        <div class="section-title">Network Interfaces</div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Interface</th>
              <th>IP Address</th>
              <th>MAC Address</th>
              <th>Netmask</th>
              <th>Family</th>
            </tr>
          </thead>
          <tbody>
            ${networkInfo.map(iface => `
              <tr>
                <td style="font-weight: 600;">${iface.name}</td>
                <td>${iface.address}</td>
                <td>${iface.mac}</td>
                <td>${iface.netmask}</td>
                <td><span class="activity-badge completed">${iface.family}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-header">
        <div class="section-title">Network Actions</div>
      </div>
      <div class="actions-grid">
        <div class="action-card" onclick="runCommand('restart wifi')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
          </svg>
          <div class="action-label">Restart Wi-Fi</div>
        </div>
        <div class="action-card" onclick="runCommand('flush dns cache')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <div class="action-label">Flush DNS</div>
        </div>
        <div class="action-card" onclick="runCommand('renew ip address')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
          </svg>
          <div class="action-label">Renew IP</div>
        </div>
        <div class="action-card" onclick="runCommand('test internet connection')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div class="action-label">Test Connection</div>
        </div>
      </div>
    </div>
  `;
}

// ===== Security View with Actions =====
async function getSecurityView() {
  let securityInfo = null;
  try {
    securityInfo = await ipcRenderer.invoke('get-security-info');
  } catch (error) {
    console.error('Failed to load security info:', error);
  }

  return `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Firewall</div>
        <div class="stat-value">${securityInfo?.firewall || 'Unknown'}</div>
        <div class="stat-subtitle">Protection</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Encryption</div>
        <div class="stat-value">${securityInfo?.encryption || 'Unknown'}</div>
        <div class="stat-subtitle">Disk</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Updates</div>
        <div class="stat-value">Current</div>
        <div class="stat-subtitle">System</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Status</div>
        <div class="stat-value">Protected</div>
        <div class="stat-subtitle">Overall</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-title">Security Actions</div>
      </div>
      <div class="actions-grid">
        <div class="action-card" onclick="runCommand('enable firewall')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <div class="action-label">Enable Firewall</div>
        </div>
        <div class="action-card" onclick="runCommand('scan for malware')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <div class="action-label">Scan for Threats</div>
        </div>
        <div class="action-card" onclick="runCommand('check for updates')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <div class="action-label">Check Updates</div>
        </div>
        <div class="action-card" onclick="runCommand('view security logs')">
          <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <div class="action-label">Security Logs</div>
        </div>
      </div>
    </div>
  `;
}

// ===== Applications View with Actions =====
async function getApplicationsView() {
  let apps = null;
  try {
    apps = await ipcRenderer.invoke('get-installed-apps');
  } catch (error) {
    console.error('Failed to load apps:', error);
  }

  if (!apps || apps.length === 0) {
    return `
      <div class="section">
        <div class="section-header">
          <div class="section-title">Installed Applications</div>
        </div>
        <div class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <div class="empty-title">No applications found</div>
          <div class="empty-desc">Unable to load installed applications</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="section">
      <div class="section-header">
        <div class="section-title">Installed Applications (${apps.length})</div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${apps.slice(0, 50).map(app => {
              const appName = typeof app === 'object' ? app.name : app;
              const appPath = typeof app === 'object' ? app.path : `/Applications/${app}.app`;
              return `
              <tr>
                <td style="font-weight: 600;">${appName}</td>
                <td style="font-size: 0.75rem; color: #737373;">${appPath}</td>
                <td>
                  <button class="btn-sm" onclick="runCommand('open ${appName}')" style="margin-right: 0.5rem;">Open</button>
                  <button class="btn-sm btn-danger" onclick="deleteApplication('${appName}', '${appPath}')">Delete</button>
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function deleteApplication(appName, appPath) {
  if (!confirm(`Delete ${appName}?\n\nThis will permanently remove the application from your device.\n\nLocation: ${appPath}`)) {
    return;
  }

  try {
    showToast(`Deleting ${appName}...`, 'info');

    // Use rm -rf to delete the application (requires user confirmation)
    // On macOS, apps are in .app bundles which can be deleted as directories
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    await execAsync(`rm -rf "${appPath}"`);

    showToast(`${appName} deleted successfully`, 'success');

    // Refresh the applications view
    if (currentView === 'applications') {
      switchView('applications');
    }
  } catch (error) {
    showToast(`Failed to delete ${appName}: ${error.message}`, 'error');
  }
}

// ===== Automation with Create Rule =====
function showCreateAutomationRule() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Create Automation Rule</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Rule Name</label>
          <input type="text" id="ruleName" class="form-input" placeholder="Enter rule name" />
        </div>
        <div class="form-group">
          <label>Trigger</label>
          <select id="ruleTrigger" class="form-input">
            <option value="schedule">On Schedule</option>
            <option value="event">On Event</option>
            <option value="condition">When Condition Met</option>
          </select>
        </div>
        <div class="form-group">
          <label>Action</label>
          <input type="text" id="ruleAction" class="form-input" placeholder="Command to execute" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="ruleDescription" class="form-input" rows="3" placeholder="What does this rule do?"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="saveAutomationRule()">Create Rule</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function saveAutomationRule() {
  const name = document.getElementById('ruleName').value.trim();
  const trigger = document.getElementById('ruleTrigger').value;
  const action = document.getElementById('ruleAction').value.trim();
  const description = document.getElementById('ruleDescription').value.trim();

  if (!name || !action) {
    showToast('Please fill in rule name and action', 'error');
    return;
  }

  // Get existing rules from localStorage
  const rules = JSON.parse(localStorage.getItem('automationRules') || '[]');

  // Add new rule
  const newRule = {
    id: Date.now().toString(),
    name,
    trigger,
    action,
    description,
    enabled: true,
    createdAt: new Date().toISOString(),
    lastRun: null,
    runCount: 0
  };

  rules.push(newRule);
  localStorage.setItem('automationRules', JSON.stringify(rules));

  showToast(`Automation rule "${name}" created!`, 'success');
  closeModal(document.querySelector('.modal'));

  // Refresh automation view if we're on it
  if (currentView === 'automation') {
    switchView('automation');
  }
}

function toggleAutomationRule(ruleId) {
  const rules = JSON.parse(localStorage.getItem('automationRules') || '[]');
  const rule = rules.find(r => r.id === ruleId);
  if (rule) {
    rule.enabled = !rule.enabled;
    localStorage.setItem('automationRules', JSON.stringify(rules));
    showToast(`Rule "${rule.name}" ${rule.enabled ? 'enabled' : 'disabled'}`, 'info');
    switchView('automation');
  }
}

async function runAutomationRule(ruleId) {
  const rules = JSON.parse(localStorage.getItem('automationRules') || '[]');
  const rule = rules.find(r => r.id === ruleId);
  if (!rule) return;

  showToast(`Running: ${rule.name}`, 'info');

  try {
    // Execute the action command
    await runCommand(rule.action);

    // Update run stats
    rule.runCount = (rule.runCount || 0) + 1;
    rule.lastRun = new Date().toISOString();
    localStorage.setItem('automationRules', JSON.stringify(rules));

    showToast(`Rule "${rule.name}" executed successfully!`, 'success');
    switchView('automation');
  } catch (error) {
    showToast(`Failed to run rule: ${error.message}`, 'error');
  }
}

function editAutomationRule(ruleId) {
  const rules = JSON.parse(localStorage.getItem('automationRules') || '[]');
  const rule = rules.find(r => r.id === ruleId);
  if (!rule) return;

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Automation Rule</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Rule Name</label>
          <input type="text" id="editRuleName" class="form-input" value="${rule.name}" />
        </div>
        <div class="form-group">
          <label>Trigger</label>
          <select id="editRuleTrigger" class="form-input">
            <option value="schedule" ${rule.trigger === 'schedule' ? 'selected' : ''}>On Schedule</option>
            <option value="event" ${rule.trigger === 'event' ? 'selected' : ''}>On Event</option>
            <option value="condition" ${rule.trigger === 'condition' ? 'selected' : ''}>When Condition Met</option>
          </select>
        </div>
        <div class="form-group">
          <label>Action</label>
          <input type="text" id="editRuleAction" class="form-input" value="${rule.action}" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="editRuleDescription" class="form-input" rows="3">${rule.description || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="updateAutomationRule('${ruleId}')">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function updateAutomationRule(ruleId) {
  const rules = JSON.parse(localStorage.getItem('automationRules') || '[]');
  const rule = rules.find(r => r.id === ruleId);
  if (!rule) return;

  rule.name = document.getElementById('editRuleName').value.trim();
  rule.trigger = document.getElementById('editRuleTrigger').value;
  rule.action = document.getElementById('editRuleAction').value.trim();
  rule.description = document.getElementById('editRuleDescription').value.trim();

  if (!rule.name || !rule.action) {
    showToast('Please fill in rule name and action', 'error');
    return;
  }

  localStorage.setItem('automationRules', JSON.stringify(rules));
  showToast(`Rule "${rule.name}" updated!`, 'success');
  closeModal(document.querySelector('.modal'));
  switchView('automation');
}

function deleteAutomationRule(ruleId, ruleName) {
  if (!confirm(`Delete automation rule "${ruleName}"?`)) return;

  const rules = JSON.parse(localStorage.getItem('automationRules') || '[]');
  const filtered = rules.filter(r => r.id !== ruleId);
  localStorage.setItem('automationRules', JSON.stringify(filtered));

  showToast(`Rule "${ruleName}" deleted`, 'success');
  switchView('automation');
}

// Make new functions globally available
window.getSettingsView = getSettingsView;
window.clearCache = clearCache;
window.getStorageView = getStorageView;
window.getNetworkingView = getNetworkingView;
window.getSecurityView = getSecurityView;
window.getApplicationsView = getApplicationsView;
window.showCreateAutomationRule = showCreateAutomationRule;
window.saveAutomationRule = saveAutomationRule;

// Override admin view row rendering to make clickable
const originalGetAdminView = getAdminView;
getAdminView = async function() {
  const html = await originalGetAdminView();
  
  // Replace the user table to add data attributes and click handlers
  return html
    .replace(
      /<tr>\s*<td style="font-weight: 600;">(.+?)<\/td>\s*<td>(.+?)<\/td>\s*<td><span class="activity-badge (.+?)">(.+?)<\/span><\/td>\s*<td>(.+?)<\/td>\s*<td>(.+?)<\/td>\s*<td><span class="activity-badge (.+?)">(.+?)<\/span><\/td>\s*<td>\s*<button class="btn-sm" onclick='editUser\((.*?)\)'/g,
      (match, username, email, roleBadge, role, tenant, type, statusBadge, status, userData) => {
        const user = JSON.parse(userData.replace(/&apos;/g, "'"));
        return `<tr data-user-id="${user.id}" onclick="showUserDetails('${user.id}')" style="cursor: pointer;">
          <td style="font-weight: 600;">${username}</td>
          <td>${email}</td>
          <td><span class="activity-badge ${roleBadge}">${role}</span></td>
          <td>${tenant}</td>
          <td>${type}</td>
          <td><span class="activity-badge ${statusBadge}">${status}</span></td>
          <td onclick="event.stopPropagation();">
            <button class="btn-sm" onclick='showUserDetails("${user.id}")' style="margin-right: 0.5rem;">View Details</button>
            <button class="btn-sm btn-danger" onclick="deleteUser('${user.id}', '${user.username}')">Delete</button>
          </td>
        </tr>`;
      }
    )
    .replace(
      /<tr>\s*<td style="font-weight: 600;">(.+?)<\/td>\s*<td><span class="activity-badge completed">(.+?)<\/span><\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(.+?)<\/td>\s*<td>\s*<button class="btn-sm" onclick='editOrganization\((.*?)\)'/g,
      (match, name, type, userCount, blockedCount, created, orgData) => {
        const org = JSON.parse(orgData.replace(/&apos;/g, "'"));
        return `<tr data-org-id="${org.id}" onclick="showOrganizationDetails('${org.id}')" style="cursor: pointer;">
          <td style="font-weight: 600;">${name}</td>
          <td><span class="activity-badge completed">${type}</span></td>
          <td>${userCount}</td>
          <td>${blockedCount}</td>
          <td>${created}</td>
          <td onclick="event.stopPropagation();">
            <button class="btn-sm" onclick='showOrganizationDetails("${org.id}")' style="margin-right: 0.5rem;">View Details</button>
            <button class="btn-sm btn-danger" onclick="deleteOrganization('${org.id}', '${org.name}')">Delete</button>
          </td>
        </tr>`;
      }
    );
};
// ===== Comprehensive Admin Detail Views =====

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
          <div class="section-title">User Details: ${user.username}</div>
          <button class="btn-danger" onclick="deleteUser('${user.id}', '${user.username}')">Delete User</button>
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
          <div class="section-title">Organization: ${org.name}</div>
          <button class="btn-danger" onclick="deleteOrganization('${org.id}', '${org.name}')">Delete Organization</button>
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
            <button class="btn-primary" onclick="manageBlockedCapabilities('${org.id}')">Manage</button>
          </div>
          <div class="actions-grid">
            <div class="action-card" onclick="manageBlockedCapabilities('${org.id}')">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              <div class="action-label">All Capabilities</div>
              <div style="font-size: 0.7rem; color: #737373; margin-top: 0.25rem;">${org.blockedCapabilities.length} blocked</div>
            </div>
            <div class="action-card" onclick="showToast('Feature access control - Manage feature permissions per user', 'info')">
              <svg class="action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              <div class="action-label">Feature Access</div>
            </div>
            <div class="action-card" onclick="showToast('API Access - Generate and manage API keys', 'info')">
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

  try {
    // If this is the current user, perform logout
    if (userId === userSession?.userId) {
      await ipcRenderer.invoke('logout');
      showToast('You have been logged out', 'success');
    } else {
      // For other users, this requires backend session management
      showToast('Force logout requires backend session invalidation (not yet implemented)', 'info');
    }
  } catch (error) {
    showToast('Failed to logout: ' + error.message, 'error');
  }
}

async function suspendAccount(userId, username) {
  if (!confirm(`Suspend account for ${username}? They will not be able to log in.`)) {
    return;
  }

  showToast('Account suspension - Requires backend account status field', 'info');
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
  const orgsData = await ipcRenderer.invoke('admin-get-organizations');
  const currentOrg = orgsData.organizations.find(o => o.id === orgId);
  const availableParents = orgsData.organizations.filter(o => o.id !== orgId && o.type !== 'home');

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Set Parent Organization</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body">
        <p style="color: #737373; margin-bottom: 1rem;">Set a parent organization to create hierarchies (e.g., MSP managing multiple clients)</p>
        <div class="form-group">
          <label>Parent Organization</label>
          <select id="parentOrgSelect" class="form-input">
            <option value="">None (Top-level organization)</option>
            ${availableParents.map(org => `
              <option value="${org.id}" ${currentOrg.parentTenantId === org.id ? 'selected' : ''}>
                ${org.name} (${org.type})
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="saveOrgParent('${orgId}')">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveOrgParent(orgId) {
  const parentId = document.getElementById('parentOrgSelect').value || null;
  try {
    await ipcRenderer.invoke('admin-update-organization', orgId, { parentTenantId: parentId });
    showToast('Parent organization updated!', 'success');
    closeModal(document.querySelector('.modal'));
    showOrganizationDetails(orgId);
  } catch (error) {
    showToast('Failed to update parent: ' + error.message, 'error');
  }
}

async function manageBlockedCapabilities(orgId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '800px';

  const orgsData = await ipcRenderer.invoke('admin-get-organizations');
  const org = orgsData.organizations.find(o => o.id === orgId);

  // Common capabilities to block
  const allCapabilities = [
    { id: 'system.shutdown', name: 'System Shutdown', category: 'System Power', risk: 'critical' },
    { id: 'system.restart', name: 'System Restart', category: 'System Power', risk: 'critical' },
    { id: 'file.delete', name: 'Delete Files', category: 'File Operations', risk: 'danger' },
    { id: 'process.kill', name: 'Kill Processes', category: 'Process Management', risk: 'warning' },
    { id: 'app.quit', name: 'Quit Applications', category: 'Application Management', risk: 'warning' },
    { id: 'network.download', name: 'Download Files', category: 'Network', risk: 'warning' },
    { id: 'file.write', name: 'Write Files', category: 'File Operations', risk: 'warning' },
    { id: 'screenshot.capture', name: 'Take Screenshots', category: 'Privacy', risk: 'warning' },
    { id: 'clipboard.read', name: 'Read Clipboard', category: 'Privacy', risk: 'safe' },
    { id: 'system.info', name: 'System Information', category: 'System Info', risk: 'safe' },
  ];

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Manage Blocked Capabilities - ${org.name}</h2>
        <button class="modal-close" onclick="closeModal(this)">&times;</button>
      </div>
      <div class="modal-body" style="max-height: 500px; overflow-y: auto;">
        <p style="color: #737373; margin-bottom: 1rem;">Select capabilities to block for this organization</p>
        <div style="display: grid; gap: 0.75rem;">
          ${allCapabilities.map(cap => {
            const isBlocked = org.blockedCapabilities.includes(cap.id);
            const riskColors = {
              critical: '#ef4444',
              danger: '#f97316',
              warning: '#eab308',
              safe: '#10b981'
            };
            return `
              <div style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <input type="checkbox"
                       id="cap-${cap.id}"
                       ${isBlocked ? 'checked' : ''}
                       style="width: 18px; height: 18px; cursor: pointer;">
                <label for="cap-${cap.id}" style="flex: 1; cursor: pointer; margin: 0;">
                  <div style="font-weight: 600;">${cap.name}</div>
                  <div style="font-size: 0.75rem; color: #737373;">${cap.category} • <span style="color: ${riskColors[cap.risk]}">${cap.risk.toUpperCase()}</span></div>
                </label>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeModal(this)">Cancel</button>
        <button class="btn-primary" onclick="saveBlockedCapabilities('${orgId}')">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function saveBlockedCapabilities(orgId) {
  const checkboxes = document.querySelectorAll('[id^="cap-"]');
  const blockedCapabilities = [];

  checkboxes.forEach(cb => {
    if (cb.checked) {
      const capId = cb.id.replace('cap-', '');
      blockedCapabilities.push(capId);
    }
  });

  try {
    await ipcRenderer.invoke('admin-update-organization', orgId, {
      blockedCapabilities: blockedCapabilities
    });
    showToast(`Blocked ${blockedCapabilities.length} capabilities`, 'success');
    closeModal(document.querySelector('.modal'));
    showOrganizationDetails(orgId);
  } catch (error) {
    showToast('Failed to update capabilities: ' + error.message, 'error');
  }
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

// Removed - use manageBlockedCapabilities instead

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
window.editUserDetails = editUserDetails;
window.editMyUsername = editMyUsername;
window.editMyEmail = editMyEmail;
// Remote Devices Functions
async function loadRemoteDevices() {
  try {
    const devices = await ipcRenderer.invoke('remote-list-devices');
    displayRemoteDevices(devices);
  } catch (error) {
    console.error('Failed to load remote devices:', error);
    document.getElementById('remoteDevicesList').innerHTML = `
      <div class="empty-state">
        <div class="empty-title">Failed to load devices</div>
        <div class="empty-subtitle">${error.message}</div>
      </div>
    `;
  }
}

function displayRemoteDevices(devices) {
  const container = document.getElementById('remoteDevicesList');

  if (!devices || devices.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">No remote devices</div>
        <div class="empty-subtitle">All your devices will appear here</div>
      </div>
    `;
    return;
  }

  const statusColors = {
    online: '#10B981',
    offline: '#6B7280',
    in_session: '#3B82F6',
    busy: '#F59E0B',
  };

  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    in_session: 'In Session',
    busy: 'Busy',
  };

  container.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Device</th>
            <th>OS</th>
            <th>Status</th>
            <th>Last Seen</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${devices.map(device => `
            <tr>
              <td>
                <strong>${device.hostname || device.device_name || 'Unknown'}</strong>
                ${device.primary_ip ? `<br><span style="color: #737373; font-size: 0.875rem;">${device.primary_ip}</span>` : ''}
              </td>
              <td>${device.os_type || 'Unknown'}</td>
              <td>
                <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColors[device.status] || '#6B7280'};"></span>
                  ${statusLabels[device.status] || 'Unknown'}
                </span>
              </td>
              <td>${device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'Never'}</td>
              <td>
                ${device.status === 'online' ? `
                  <button class="action-btn" onclick="connectToDevice('${device.id}', '${device.hostname}')">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                    Connect
                  </button>
                ` : `
                  <button class="action-btn" disabled style="opacity: 0.5; cursor: not-allowed;">
                    Offline
                  </button>
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function refreshRemoteDevices() {
  document.getElementById('remoteDevicesList').innerHTML = `
    <div style="padding: 2rem; text-align: center; color: rgba(255,255,255,0.5);">
      Refreshing...
    </div>
  `;
  await loadRemoteDevices();
}

async function connectToDevice(deviceId, deviceName) {
  try {
    if (!confirm(`Connect to ${deviceName}?`)) {
      return;
    }

    // Create session and open remote window
    const session = await ipcRenderer.invoke('remote-create-session', deviceId);

    console.log('Remote session created:', session.id);
    // Remote session window will open automatically

  } catch (error) {
    console.error('Failed to connect to device:', error);
    alert(`Failed to connect: ${error.message}`);
  }
}

window.loadRemoteDevices = loadRemoteDevices;
window.refreshRemoteDevices = refreshRemoteDevices;
window.connectToDevice = connectToDevice;

window.editMyFullName = editMyFullName;
window.editMyPassword = editMyPassword;
window.saveMyPassword = saveMyPassword;
window.toggleResultView = toggleResultView;
window.addUserToOrganization = addUserToOrganization;
window.saveAddUserToOrg = saveAddUserToOrg;
window.removeUserFromOrganization = removeUserFromOrganization;
window.changeUserRole = changeUserRole;
window.manageOrgCapabilities = manageOrgCapabilities;
window.editUserDetails = editUserDetails;
window.editOrganizationSettings = editOrganizationSettings;
