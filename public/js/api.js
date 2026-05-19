/**
 * VET Portal — CAL API Client
 * Connects to the Cox Automotive Ledger backend
 */

const API_BASE = window.location.hostname === 'localhost'
  ? 'https://cox-automotive-ledger.onrender.com'
  : 'https://cox-automotive-ledger.onrender.com';

const API_KEY = ''; // Public read endpoints don't require auth

async function calFetch(path) {
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

async function calPost(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API Error: ${res.status}`);
  }
  return res.json();
}

// ── Public API Methods ──

async function verifyCertificate(certId) {
  return calFetch(`/api/verify/cert/${encodeURIComponent(certId)}`);
}

async function getVehiclePassport(vin) {
  return calFetch(`/api/passport/${encodeURIComponent(vin)}`);
}

async function getRecentActivity(limit = 10) {
  return calFetch(`/api/activity?limit=${limit}`);
}

async function getStats() {
  return calFetch('/api/stats');
}

async function getHealth() {
  return calFetch('/api/health');
}

async function searchCertificates(query) {
  return calFetch(`/api/search?q=${encodeURIComponent(query)}`);
}

async function seedDemoData() {
  return calPost('/api/demo/seed', {});
}

async function getAllCertificates() {
  return calFetch('/api/certificates');
}
