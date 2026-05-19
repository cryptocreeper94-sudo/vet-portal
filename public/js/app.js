/**
 * VET Portal — Main Application Logic
 * Handles routing, search, certificate display, and passport rendering
 */

let searchMode = 'auto';
let currentView = 'landing';

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  // Enter key on search
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Check URL hash for deep links
  handleRoute();
  window.addEventListener('hashchange', handleRoute);

  // Load stats and feed
  loadStats();
  loadFeed();
});

// ── Routing ──
function handleRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#/cert/')) {
    const id = decodeURIComponent(hash.replace('#/cert/', ''));
    showCertView(id);
  } else if (hash.startsWith('#/vin/')) {
    const vin = decodeURIComponent(hash.replace('#/vin/', ''));
    showPassportView(vin);
  } else {
    showLanding();
  }
}

function showLanding() {
  document.getElementById('view-landing').style.display = '';
  document.getElementById('view-cert').style.display = 'none';
  document.getElementById('view-passport').style.display = 'none';
  currentView = 'landing';
  window.history.pushState(null, '', '/');
}

function showCertView(certId) {
  document.getElementById('view-landing').style.display = 'none';
  document.getElementById('view-cert').style.display = '';
  document.getElementById('view-passport').style.display = 'none';
  currentView = 'cert';
  loadCertificate(certId);
}

function showPassportView(vin) {
  document.getElementById('view-landing').style.display = 'none';
  document.getElementById('view-cert').style.display = 'none';
  document.getElementById('view-passport').style.display = '';
  currentView = 'passport';
  loadPassport(vin);
}

// ── Search ──
function setSearchMode(mode, el) {
  searchMode = mode;
  document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const input = document.getElementById('searchInput');
  if (mode === 'cert') input.placeholder = 'Enter Certificate ID (e.g., cert_abc123)...';
  else if (mode === 'vin') input.placeholder = 'Enter VIN (e.g., 1HGCM82633A004352)...';
  else input.placeholder = 'Enter Certificate ID or VIN...';
}

async function handleSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  let mode = searchMode;
  if (mode === 'auto') {
    // VINs are exactly 17 alphanumeric chars
    if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(query)) mode = 'vin';
    else mode = 'cert';
  }

  if (mode === 'vin') {
    window.location.hash = `#/vin/${encodeURIComponent(query.toUpperCase())}`;
  } else {
    window.location.hash = `#/cert/${encodeURIComponent(query)}`;
  }
}

// ── Load Stats ──
async function loadStats() {
  try {
    const stats = await getStats();
    document.getElementById('certCount').textContent = stats.totalCertificates || '0';
    document.getElementById('validatorCount').textContent = `${(stats.validators || []).length} Facilities`;
  } catch (e) {
    // If chain is empty, seed it
    try {
      await seedDemoData();
      const stats = await getStats();
      document.getElementById('certCount').textContent = stats.totalCertificates || '0';
      document.getElementById('validatorCount').textContent = `${(stats.validators || []).length} Facilities`;
    } catch (e2) {
      console.warn('Could not load stats:', e2);
    }
  }
}

// ── Load Feed ──
async function loadFeed() {
  const container = document.getElementById('feedList');
  try {
    let activity = await getRecentActivity(8);

    // If empty, seed demo data and retry
    if (!activity || activity.length === 0) {
      await seedDemoData();
      activity = await getRecentActivity(8);
    }

    if (!activity || activity.length === 0) {
      container.innerHTML = '<div class="state-panel"><div class="state-icon">📋</div><div class="state-desc">No activity yet</div></div>';
      return;
    }

    container.innerHTML = activity.map(item => {
      const typeClass = item.type === 'CUSTODY_TRANSFER' ? 'custody'
        : item.type === 'CONDITION_REPORT' ? 'condition'
        : item.type === 'DRIVER_PERFORMANCE' ? 'performance'
        : item.type === 'ARBITRATION_PROOF' ? 'arbitration' : '';
      const typeLabel = item.type.replace(/_/g, ' ');
      const time = formatTimeAgo(item.timestamp);
      return `
        <div class="feed-item" onclick="window.location.hash='#/cert/${item.certId}'">
          <div class="feed-dot"></div>
          <span class="feed-type ${typeClass}">${typeLabel}</span>
          <div class="feed-text">${escapeHtml(item.summary)}</div>
          <div class="feed-time">${time}</div>
        </div>`;
    }).join('');
  } catch (e) {
    container.innerHTML = '<div class="state-panel"><div class="state-icon">⚠️</div><div class="state-title">Unable to connect</div><div class="state-desc">The ledger API may be starting up. Try refreshing in a moment.</div></div>';
  }
}

// ── Certificate Verification ──
async function loadCertificate(certId) {
  const container = document.getElementById('certContent');
  container.innerHTML = '<div class="state-panel"><div class="spinner"></div><div class="state-desc">Verifying certificate...</div></div>';

  try {
    const data = await verifyCertificate(certId);
    renderCertificate(container, data);
  } catch (e) {
    // Maybe it's a VIN?
    if (certId.length === 17) {
      showPassportView(certId);
      return;
    }
    // Try searching
    try {
      const search = await searchCertificates(certId);
      if (search.results && search.results.length > 0) {
        const first = search.results[0];
        const data = await verifyCertificate(first.certId);
        renderCertificate(container, data);
        return;
      }
    } catch (e2) { /* ignore */ }

    container.innerHTML = `
      <div class="state-panel">
        <div class="state-icon">🔍</div>
        <div class="state-title">Certificate Not Found</div>
        <div class="state-desc">No certificate matching "<strong>${escapeHtml(certId)}</strong>" was found on the ledger.<br>Check the ID and try again, or search by VIN.</div>
      </div>`;
  }
}

function renderCertificate(container, data) {
  const c = data.certificate;
  const b = data.block;
  const h = data.hallmark;
  const typeLabel = c.type.replace(/_/g, ' ');
  const date = new Date(c.timestamp).toLocaleString();

  container.innerHTML = `
    <!-- Hallmark Stamp -->
    <div class="hallmark">
      <div class="hallmark-seal">✓</div>
      <div class="hallmark-status">${data.verified ? 'VERIFIED' : 'UNVERIFIED'}</div>
      <div class="hallmark-serial">${escapeHtml(data.serial)}</div>
      <div class="hallmark-fingerprint">${escapeHtml(data.fingerprint)}</div>
    </div>

    <!-- Certificate Details -->
    <div class="detail-grid">
      <div class="detail-card">
        <div class="detail-label">Certificate Type</div>
        <div class="detail-value highlight">${typeLabel}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Issued</div>
        <div class="detail-value">${date}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Facility</div>
        <div class="detail-value">${escapeHtml(c.facilityId)}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Agent</div>
        <div class="detail-value">${escapeHtml(c.agentId)}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Certificate ID</div>
        <div class="detail-value mono">${escapeHtml(c.id)}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Payload Hash</div>
        <div class="detail-value mono">${escapeHtml(c.payloadHash)}</div>
      </div>
    </div>

    <!-- Block Proof -->
    <h3 style="margin: 2.5rem 0 1rem; font-size: 1rem; color: var(--gray-300);">Block Proof</h3>
    <div class="detail-grid">
      <div class="detail-card">
        <div class="detail-label">Block Index</div>
        <div class="detail-value highlight">#${b.index}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Validator</div>
        <div class="detail-value">${escapeHtml(b.validatorId)}${data.validator ? ' · ' + escapeHtml(data.validator.facility) : ''}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Block Hash</div>
        <div class="detail-value mono">${escapeHtml(b.hash || '')}</div>
      </div>
      <div class="detail-card">
        <div class="detail-label">Merkle Root</div>
        <div class="detail-value mono">${escapeHtml(b.merkleRoot)}</div>
      </div>
    </div>

    <!-- Chain Integrity -->
    <div style="margin-top: 2rem; text-align: center; padding: 1.25rem; border-radius: var(--radius); background: ${h.chainIntegrity ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)'}; border: 1px solid ${h.chainIntegrity ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};">
      <div style="font-size: 0.75rem; font-weight: 700; color: ${h.chainIntegrity ? 'var(--emerald-400)' : 'var(--red-400)'}; text-transform: uppercase; letter-spacing: 0.1em;">
        ${h.chainIntegrity ? '✓ Chain Integrity Verified' : '✗ Chain Integrity Failed'}
      </div>
      <div style="font-size: 0.7rem; color: var(--gray-500); margin-top: 0.25rem;">
        ${h.network} · ${h.consensus} · ${h.hashAlgorithm}
      </div>
    </div>

    <!-- Actions -->
    <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap;">
      <button class="btn" onclick="window.print()">🖨 Print Certificate</button>
      <button class="btn" onclick="copyLink()">🔗 Copy Verification Link</button>
    </div>
  `;
}

// ── Vehicle Passport ──
async function loadPassport(vin) {
  const container = document.getElementById('passportContent');
  container.innerHTML = '<div class="state-panel"><div class="spinner"></div><div class="state-desc">Loading vehicle passport...</div></div>';

  try {
    const data = await getVehiclePassport(vin);
    renderPassport(container, data);
  } catch (e) {
    container.innerHTML = `
      <div class="state-panel">
        <div class="state-icon">🚗</div>
        <div class="state-title">Vehicle Not Found</div>
        <div class="state-desc">No records for VIN "<strong>${escapeHtml(vin)}</strong>" were found on the ledger.<br>This vehicle may not have been processed through a Cox Automotive facility yet.</div>
      </div>`;
  }
}

function renderPassport(container, data) {
  const firstSeen = new Date(data.firstSeen).toLocaleDateString();
  const lastActivity = new Date(data.lastActivity).toLocaleDateString();
  const stateLabel = data.currentState.replace(/_/g, ' ');

  // Health section
  let healthHtml = '';
  if (data.healthSnapshot) {
    const hs = data.healthSnapshot;
    const bars = Object.entries(hs.healthScores || {}).map(([key, val]) => `
      <div class="health-bar-item">
        <label><span>${key}</span><span>${val}%</span></label>
        <div class="health-bar-track"><div class="health-bar-fill" style="width:${val}%; background: ${val > 80 ? 'var(--emerald-500)' : val > 60 ? 'var(--gold-500)' : 'var(--red-500)'}"></div></div>
      </div>`).join('');
    healthHtml = `
      <div class="health-card">
        <h3 style="text-align:center; margin-bottom: 0.5rem; font-size: 0.8rem; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.1em;">Latest Health Assessment</h3>
        <div class="health-score-big">${hs.overall}%</div>
        <div style="text-align:center; font-size: 0.75rem; color: var(--gray-500);">${(hs.faultCodes || []).length} fault codes detected</div>
        <div class="health-bars">${bars}</div>
      </div>`;
  }

  // Timeline
  const timelineItems = [
    ...data.custodyChain.map(c => ({
      type: 'CUSTODY', color: '#38bdf8', timestamp: c.timestamp,
      desc: `${c.from || '?'} → ${c.to || '?'}`,
      meta: `Agent: ${c.agent} · ${c.location || 'Unknown'} · ${new Date(c.timestamp).toLocaleString()}`,
      certId: c.certId
    })),
    ...data.conditionReports.map(c => ({
      type: 'CONDITION', color: 'var(--emerald-400)', timestamp: c.timestamp,
      desc: `Health Score: ${c.overall}% · ${(c.faultCodes || []).length} faults`,
      meta: new Date(c.timestamp).toLocaleString(),
      certId: c.certId
    })),
    ...data.arbitrations.map(c => ({
      type: 'ARBITRATION', color: 'var(--red-400)', timestamp: c.timestamp,
      desc: `Match: ${c.match ? 'YES' : 'NO'} · Ruling: ${c.ruling || 'Pending'}`,
      meta: new Date(c.timestamp).toLocaleString(),
      certId: c.certId
    }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  const timelineHtml = timelineItems.map(item => `
    <div class="timeline-item">
      <div class="timeline-dot" style="border-color: ${item.color}"></div>
      <div class="timeline-content" onclick="window.location.hash='#/cert/${item.certId}'" style="cursor:pointer">
        <div class="timeline-type" style="color: ${item.color}">${item.type}</div>
        <div class="timeline-desc">${escapeHtml(item.desc)}</div>
        <div class="timeline-meta">${escapeHtml(item.meta)}</div>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div class="passport-header">
      <div style="font-size: 0.7rem; color: var(--gray-500); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.5rem;">Vehicle Asset Passport</div>
      <div class="passport-vin">${escapeHtml(data.vin)}</div>
      <div class="passport-state active">${stateLabel}</div>
      <div style="display: flex; justify-content: center; gap: 2rem; margin-top: 1.5rem;">
        <div><div style="font-size: 1.5rem; font-weight: 700; color: var(--white)">${data.totalEvents}</div><div style="font-size: 0.65rem; color: var(--gray-500); text-transform: uppercase">Total Events</div></div>
        <div><div style="font-size: 1.5rem; font-weight: 700; color: var(--white)">${data.custodyChain.length}</div><div style="font-size: 0.65rem; color: var(--gray-500); text-transform: uppercase">Transfers</div></div>
        <div><div style="font-size: 1.5rem; font-weight: 700; color: var(--white)">${data.conditionReports.length}</div><div style="font-size: 0.65rem; color: var(--gray-500); text-transform: uppercase">Scans</div></div>
      </div>
      <div style="font-size: 0.7rem; color: var(--gray-500); margin-top: 1rem;">First seen ${firstSeen} · Last activity ${lastActivity}</div>
    </div>

    ${healthHtml}

    <h3 style="margin: 2rem 0 1rem; font-size: 1rem;">Provenance Timeline</h3>
    <div class="timeline">${timelineHtml}</div>

    <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap;">
      <button class="btn" onclick="window.print()">🖨 Print Passport</button>
      <button class="btn" onclick="copyLink()">🔗 Copy Link</button>
    </div>
  `;
}

// ── Utilities ──
function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    alert('Verification link copied to clipboard');
  });
}
