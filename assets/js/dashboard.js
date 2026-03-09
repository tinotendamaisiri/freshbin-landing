const SUPABASE_URL = 'https://fuyvrepazocbkufywexu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1eXZyZXBhem9jYmt1Znl3ZXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzgzNzMsImV4cCI6MjA4ODUxNDM3M30.70d9VKNHI1xGVVJjKF4BvRpQa1fFq6a1cH3IRzC2FRE';

let supabaseClient;
let allBookings = [];
let currentTab = 'all';
let map, markers = [];

window.addEventListener('load', async () => {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  map = L.map('map').setView([40.7282, -73.7949], 12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '©OpenStreetMap ©CartoDB', maxZoom: 19
  }).addTo(map);

  document.getElementById('login-btn').addEventListener('click', adminLogin);
  document.getElementById('admin-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') adminLogin();
  });

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    document.getElementById('auth-gate').style.display = 'none';
    loadBookings();
  }
});

async function adminLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Signing in...';
  btn.disabled = true;

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    let msg = error.message;
    if (msg.includes('Invalid login credentials')) msg = 'Wrong email or password. Try again.';
    else if (msg.includes('Email not confirmed')) msg = 'Please verify your email first.';
    document.getElementById('auth-error').textContent = msg;
    document.getElementById('auth-error').style.display = 'block';
    btn.textContent = 'Enter Dashboard';
    btn.disabled = false;
  } else {
    document.getElementById('auth-gate').style.display = 'none';
    loadBookings();
  }
}

function showResetForm() {
  document.getElementById('reset-form').style.display = 'block';
  document.getElementById('login-form').style.display = 'none';
}

function showLoginForm() {
  document.getElementById('reset-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
}

async function sendResetEmail() {
  const email = document.getElementById('reset-email').value.trim();
  if (!email) {
    document.getElementById('reset-error').textContent = 'Please enter your email.';
    document.getElementById('reset-error').style.display = 'block';
    return;
  }
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://freshbin.nyc/admin/'
  });
  if (error) {
    document.getElementById('reset-error').textContent = error.message;
    document.getElementById('reset-error').style.display = 'block';
  } else {
    document.getElementById('reset-success').style.display = 'block';
    document.getElementById('reset-error').style.display = 'none';
  }
}

async function adminLogout() {
  await supabaseClient.auth.signOut();
  location.reload();
}

async function loadBookings() {
  document.getElementById('bookings-panel').innerHTML = '<div class="loading"><div class="loading-spinner"></div>Loading bookings...</div>';
  try {
    const { data, error } = await supabaseClient.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allBookings = data;
    updateStats();
    updateCounts();
    populateMonthFilter();
    renderBookings();
  } catch(e) {
    document.getElementById('bookings-panel').innerHTML = '<div class="empty">Failed to load bookings. Check connection.</div>';
  }
}

function updateStats() {
  const total = allBookings.length;
  const done = allBookings.filter(b => b.status === 'done').length;
  const pending = total - done;
  const revenue = allBookings.reduce((s,b) => s + (b.estimated_price || 0), 0);
  const paid = allBookings.filter(b => b.payment_date).length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pending').textContent = pending;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-revenue').textContent = '$' + revenue.toLocaleString();
  document.getElementById('stat-paid').textContent = paid;
}

function updateCounts() {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  document.getElementById('count-all').textContent = allBookings.length;
  days.forEach(d => {
    const count = allBookings.filter(b => b.service_day === d).length;
    document.getElementById('count-' + d).textContent = count;
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  renderBookings();
}

function renderBookings() {
  const filtered = getFilteredBookings();
  const panel = document.getElementById('bookings-panel');

  if (!filtered.length) {
    panel.innerHTML = '<div class="empty">No bookings yet for this day.</div>';
    clearMarkers();
    return;
  }

  const dayLabel = currentTab === 'all' ? 'All Bookings' : currentTab + 's Route';
  let html = `<div class="day-label">${dayLabel} (${filtered.length})</div>`;

  filtered.forEach((b, i) => {
    const isDone = b.status === 'done';
    const planLabel = b.plan === 'onetime' ? 'One-Time' : b.plan === 'monthly' ? 'Monthly' : 'Annual';
    const waterIcon = b.water_access === 'yes' ? '<span class="badge badge-water-yes">💧 Has Spigot</span>' : b.water_access === 'no' ? '<span class="badge badge-water-no">🚫 No Water</span>' : b.water_access === 'unsure' ? '<span class="badge badge-water-unsure">❓ Unsure</span>' : '';
    const price = b.estimated_price ? '$' + b.estimated_price : '—';

    html += `
    <div class="booking-card ${isDone ? 'done' : ''}" id="card-${b.id}">
      <div class="card-top">
        <div class="card-num">${i+1}</div>
        <div class="card-info">
          <div class="card-name">${b.name || '—'}</div>
          <div class="card-address">${b.address || '—'}, ${b.zip || ''}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:rgba(255,255,255,0.35);">Clean: ${b.start_month || '—'}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px;">Booked: ${b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) : '—'}</div>
        </div>
      </div>
      <div class="card-badges">
        <span class="badge badge-plan">${planLabel}</span>
        <span class="badge badge-bins">${b.bins || 1} bin${b.bins > 1 ? 's' : ''}</span>
        <span class="badge badge-price">${price}</span>
        ${waterIcon}
      </div>
      ${b.payment_date ?
        `<div style="font-size:11px;color:#ffc800;margin-top:6px;">💰 Paid via ${b.payment_method || 'unknown'} · ${new Date(b.payment_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>` :
        `<div style="font-size:11px;color:rgba(255,80,80,0.7);margin-top:6px;">⏳ Payment pending</div>`
      }
      <div class="card-actions">
        <a class="action-btn btn-nav" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((b.address||'') + ' ' + (b.zip||'') + ' Queens NY')}" target="_blank">🗺 Navigate</a>
        <a class="action-btn btn-call" href="tel:${b.phone}">📞 Call</a>
        <button class="action-btn btn-done ${isDone ? 'completed' : ''}" onclick="markDone(${b.id}, ${isDone})">${isDone ? '✅ Done' : 'Mark Done'}</button>
        <button class="action-btn btn-paid ${b.payment_date ? 'paid' : ''}" onclick="markPaid(${b.id}, ${b.payment_date ? 'true' : 'false'})">${b.payment_date ? '💰 Paid' : 'Mark Paid'}</button>
      </div>
    </div>`;
  });

  panel.innerHTML = html;
  updateMap(filtered);
}

function clearMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
}

async function updateMap(bookings) {
  clearMarkers();
  for (let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    if (!b.address) continue;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(b.address + ' ' + b.zip + ' Queens NY')}&format=json&limit=1`);
      const data = await res.json();
      if (data[0]) {
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:#00C896;color:#000;font-weight:800;font-size:11px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;">${i+1}</div>`,
          iconSize: [24,24], iconAnchor: [12,12]
        });
        const marker = L.marker([data[0].lat, data[0].lon], {icon})
          .addTo(map)
          .bindPopup(`<b>${b.name}</b><br>${b.address}<br>${b.plan} — ${b.bins} bin(s)`);
        markers.push(marker);
      }
    } catch(e) {}
  }
  if (markers.length) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

async function markPaid(id, alreadyPaid) {
  if (alreadyPaid) return;
  const isZelle = confirm('Mark as paid. Was this paid via Zelle?\nOK = Zelle | Cancel = Card');
  const method = isZelle ? 'zelle' : 'card';
  await supabaseClient.from('bookings').update({
    payment_date: new Date().toISOString(),
    payment_method: method
  }).eq('id', id);
  await loadBookings();
}

async function markDone(id, currentlyDone) {
  const newStatus = currentlyDone ? 'pending' : 'done';
  await supabaseClient.from('bookings').update({ status: newStatus }).eq('id', id);
  await loadBookings();
}

// ── FILTERS ──
let activeFilters = { month: '', plan: '', status: '', water: '' };

function populateMonthFilter() {
  const months = [...new Set(allBookings.map(b => b.start_month).filter(Boolean))].sort();
  const sel = document.getElementById('filter-month');
  sel.innerHTML = '<option value="">All Months</option>';
  months.forEach(m => sel.innerHTML += `<option value="${m}">${m}</option>`);
}

function applyFilters() {
  activeFilters.month  = document.getElementById('filter-month').value;
  activeFilters.plan   = document.getElementById('filter-plan').value;
  activeFilters.status = document.getElementById('filter-status').value;
  activeFilters.water  = document.getElementById('filter-water').value;
  renderBookings();
}

function clearFilters() {
  document.getElementById('filter-month').value  = '';
  document.getElementById('filter-plan').value   = '';
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-water').value  = '';
  activeFilters = { month: '', plan: '', status: '', water: '' };
  renderBookings();
}

function getFilteredBookings() {
  let list = currentTab === 'all' ? allBookings : allBookings.filter(b => b.service_day === currentTab);
  if (activeFilters.month)  list = list.filter(b => b.start_month === activeFilters.month);
  if (activeFilters.plan)   list = list.filter(b => b.plan === activeFilters.plan);
  if (activeFilters.status) list = list.filter(b => b.status === activeFilters.status);
  if (activeFilters.water)  list = list.filter(b => b.water_access === activeFilters.water);
  return list;
}

// ── ROUTE OPTIMIZATION (nearest neighbor) ──
async function optimizeRoute() {
  const filtered = getFilteredBookings();
  if (filtered.length < 2) { alert('Need at least 2 bookings to optimize route.'); return; }

  const btn = document.querySelector('button[onclick="optimizeRoute()"]');
  btn.textContent = '⏳ Optimizing...';
  btn.disabled = true;

  const geocoded = [];
  for (const b of filtered) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(b.address + ' ' + b.zip + ' Queens NY')}&format=json&limit=1`);
      const data = await res.json();
      if (data[0]) {
        geocoded.push({ ...b, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 300));
  }

  if (!geocoded.length) { alert('Could not geocode addresses.'); btn.textContent = '🗺 Optimize Route'; btn.disabled = false; return; }

  const optimized = [];
  const remaining = [...geocoded];
  let current = remaining.splice(0, 1)[0];
  optimized.push(current);

  while (remaining.length) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((b, i) => {
      const dist = Math.sqrt(Math.pow(b.lat - current.lat, 2) + Math.pow(b.lng - current.lng, 2));
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    });
    current = remaining.splice(nearestIdx, 1)[0];
    optimized.push(current);
  }

  const panel = document.getElementById('bookings-panel');
  const dayLabel = currentTab === 'all' ? 'Optimized Route' : currentTab + 's Optimized Route';
  let html = `<div class="day-label" style="color:#ffc800;">⚡ ${dayLabel} (${optimized.length} stops)</div>`;
  html += `<div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:12px;padding:8px 12px;background:rgba(255,200,0,0.05);border-radius:8px;border:1px solid rgba(255,200,0,0.1);">Route optimized for minimum driving distance. Follow stops in order 1 → ${optimized.length}.</div>`;

  optimized.forEach((b, i) => {
    const isDone = b.status === 'done';
    const planLabel = b.plan === 'onetime' ? 'One-Time' : b.plan === 'monthly' ? 'Monthly' : 'Annual';
    const price = b.estimated_price ? '$' + b.estimated_price : '—';
    html += `
    <div class="booking-card ${isDone ? 'done' : ''}" id="card-${b.id}">
      <div class="card-top">
        <div class="card-num" style="background:#ffc800;color:#000;">${i+1}</div>
        <div class="card-info">
          <div class="card-name">${b.name || '—'}</div>
          <div class="card-address">${b.address || '—'}, ${b.zip || ''}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:rgba(255,255,255,0.35);">Clean: ${b.start_month || '—'}</div>
          <div style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px;">Booked: ${b.created_at ? new Date(b.created_at).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) : '—'}</div>
        </div>
      </div>
      <div class="card-badges">
        <span class="badge badge-plan">${planLabel}</span>
        <span class="badge badge-bins">${b.bins || 1} bin${b.bins > 1 ? 's' : ''}</span>
        <span class="badge badge-price">${price}</span>
      </div>
      ${b.payment_date ?
        `<div style="font-size:11px;color:#ffc800;margin-top:6px;">💰 Paid via ${b.payment_method || 'unknown'} · ${new Date(b.payment_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div>` :
        `<div style="font-size:11px;color:rgba(255,80,80,0.7);margin-top:6px;">⏳ Payment pending</div>`
      }
      <div class="card-actions">
        <a class="action-btn btn-nav" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((b.address||'') + ' ' + (b.zip||'') + ' Queens NY')}" target="_blank">🗺 Navigate</a>
        <a class="action-btn btn-call" href="tel:${b.phone}">📞 Call</a>
        <button class="action-btn btn-done ${isDone ? 'completed' : ''}" onclick="markDone(${b.id}, ${isDone})">${isDone ? '✅ Done' : 'Mark Done'}</button>
        <button class="action-btn btn-paid ${b.payment_date ? 'paid' : ''}" onclick="markPaid(${b.id}, ${b.payment_date ? 'true' : 'false'})">${b.payment_date ? '💰 Paid' : 'Mark Paid'}</button>
      </div>
    </div>`;
  });

  const waypoints = optimized.slice(1, -1).map(b => encodeURIComponent(b.address + ' ' + b.zip + ' Queens NY')).join('|');
  const origin = encodeURIComponent(optimized[0].address + ' ' + optimized[0].zip + ' Queens NY');
  const destination = encodeURIComponent(optimized[optimized.length-1].address + ' ' + optimized[optimized.length-1].zip + ' Queens NY');
  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  html += `<a href="${gmapsUrl}" target="_blank" style="display:block;text-align:center;padding:14px;background:#ffc800;color:#000;font-weight:800;border-radius:12px;text-decoration:none;margin-top:8px;font-family:'DM Sans',sans-serif;">🗺 Open Full Route in Google Maps</a>`;

  panel.innerHTML = html;
  updateMap(optimized);
  btn.textContent = '🗺 Optimize Route';
  btn.disabled = false;
}

// ── EXPORTS ──
function toggleExportMenu() {
  const menu = document.getElementById('export-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('[onclick="toggleExportMenu()"]') && !e.target.closest('#export-menu')) {
    const menu = document.getElementById('export-menu');
    if (menu) menu.style.display = 'none';
  }
});

function getExportData() {
  return getFilteredBookings().map((b, i) => ({
    '#': i + 1,
    'Name': b.name || '',
    'Phone': b.phone || '',
    'Email': b.email || '',
    'Address': b.address || '',
    'ZIP': b.zip || '',
    'Service Day': b.service_day || '',
    'Plan': b.plan || '',
    'Bins': b.bins || 1,
    'Start Month': b.start_month || '',
    'Clean Week': b.clean_week || '',
    'Water Access': b.water_access || '',
    'Status': b.status || 'pending',
    'Est. Price': b.estimated_price || 0,
    'Source': b.source || '',
    'Notes': b.notes || '',
    'Booked At': b.created_at ? new Date(b.created_at).toLocaleDateString() : ''
  }));
}

function exportCSV() {
  const data = getExportData();
  if (!data.length) { alert('No bookings to export.'); return; }
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `freshbin-bookings-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  document.getElementById('export-menu').style.display = 'none';
}

function exportExcel() {
  const data = getExportData();
  if (!data.length) { alert('No bookings to export.'); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
  XLSX.writeFile(wb, `freshbin-bookings-${new Date().toISOString().slice(0,10)}.xlsx`);
  document.getElementById('export-menu').style.display = 'none';
}

function exportPDF() {
  const data = getExportData();
  if (!data.length) { alert('No bookings to export.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('FreshBin NYC — Bookings Export', 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()} | ${data.length} bookings`, 14, 22);
  const cols = ['#','Name','Phone','Address','ZIP','Service Day','Plan','Bins','Start Month','Status','Est. Price'];
  const rows = data.map(r => [r['#'],r['Name'],r['Phone'],r['Address'],r['ZIP'],r['Service Day'],r['Plan'],r['Bins'],r['Start Month'],r['Status'],'$'+r['Est. Price']]);
  doc.autoTable({ head: [cols], body: rows, startY: 27, styles: { fontSize: 7 }, headStyles: { fillColor: [0, 100, 75] } });
  doc.save(`freshbin-bookings-${new Date().toISOString().slice(0,10)}.pdf`);
  document.getElementById('export-menu').style.display = 'none';
}

async function exportRoutingCSV() {
  const data = getFilteredBookings();
  if (!data.length) { alert('No bookings to export.'); return; }

  const rows = [['Stop','Name','Address','ZIP','Full Address','Phone','Plan','Bins','Service Day','Notes','Latitude','Longitude']];

  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    let lat = '', lng = '';
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(b.address + ' ' + b.zip + ' Queens NY')}&format=json&limit=1`);
      const geo = await res.json();
      if (geo[0]) { lat = geo[0].lat; lng = geo[0].lon; }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 300));
    rows.push([i+1, b.name, b.address, b.zip, `${b.address}, ${b.zip}, Queens, NY`, b.phone, b.plan, b.bins, b.service_day, b.notes || '', lat, lng]);
  }

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `freshbin-routing-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  document.getElementById('export-menu').style.display = 'none';
}
