// ================= DATA VERSION (bump this to force localStorage reset) =================
const DATA_VERSION = '2026-09-27-v5';

(function checkDataVersion() {
    const storedVersion = localStorage.getItem('ca_data_version');
    if (storedVersion !== DATA_VERSION) {
        // Clear all app-specific localStorage keys so fresh INITIAL_* data is used
        ['ca_users', 'ca_products', 'ca_services', 'ca_orders', 'ca_tasks',
            'ca_current_user', 'ca_revenue_reset_baseline'].forEach(key => localStorage.removeItem(key));
        localStorage.setItem('ca_data_version', DATA_VERSION);
        try { sessionStorage.removeItem('ca_current_user'); } catch (e) { /* ignore */ }
        console.log(`[CoolingArt] Data version updated: ${storedVersion || 'none'} → ${DATA_VERSION}. LocalStorage reset.`);
    }
})();

// Reads this tab's own login session. (The old shared localStorage copy is deliberately ignored
// and removed — it was the cause of one tab taking over another tab's account.)
function loadSessionUser() {
    try { localStorage.removeItem('ca_current_user'); } catch (e) { /* ignore */ }
    try { return JSON.parse(sessionStorage.getItem('ca_current_user')) || null; } catch (e) { return null; }
}

// ================= INITIAL DATABASE SEEDS =================
// ================= SUPABASE CLIENT CONFIGURATION =================
const SUPABASE_URL = 'https://qbmejpfxtsxxyseejmkr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFibWVqcGZ4dHN4eHlzZWVqbWtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTI1NTksImV4cCI6MjEwNjA4ODU1OX0.RsOzI0-N-W7EZVcbYrW_802R0JN1n7Om0OErKOEXCOc';

let supabaseClient = null;
if (typeof supabase !== 'undefined' && supabase.createClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function getSupabaseEmail(username) {
    return `${username.trim().toLowerCase()}@acsite.local`;
}


const INITIAL_PRODUCTS = [
    { id: 'p1', name: 'Carrier Inverter 2.25 HP Split AC', category: 'Split AC', price: 28500, specs: 'Fast Cooling, Energy Saving, R410A Eco Gas', image: 'https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?auto=format&fit=crop&w=600&q=80' },
    { id: 'p2', name: 'Sharp 1.5 HP Cooling & Heating Inverter', category: 'Split AC', price: 21000, specs: 'Plasma Cluster Technology, Digital Display', image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80' },
    { id: 'p3', name: 'LG Dual Inverter Central VRF Unit 5 HP', category: 'Central AC', price: 68000, specs: 'Multi-room air distribution, Heavy Duty', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80' },
    { id: 'p4', name: 'Fresh Smart Portable AC Unit 1.75 HP', category: 'Portable AC', price: 14500, specs: 'Wheeled mobility, Remote Control', image: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=600&q=80' }
];

const INITIAL_TECH_SERVICES = [
    { id: 's1', name: 'Emergency Breakdown Technical Fix', price: 400, desc: 'Diagnostic visit and electrical fault repair for frozen/non-cooling units.' },
    { id: 's2', name: 'Full Freon Gas Refill (R410A / R22)', price: 850, desc: 'Complete pressure check, leak detection, and full gas pressure recharge.' },
    { id: 's3', name: 'Deep Chemical Duct & Coil Wash', price: 500, desc: 'Pressure jet wash, antibacterial filter treatment, and drainage unblocking.' },
    { id: 's4', name: 'Complete AC Dismantle & Re-Installation', price: 1200, desc: 'Professional relocation including copper pipe insulation and testing.' },
    { id: 's5', name: 'Cooling Art Protection Insurance', price: 100, desc: 'Monthly protection plan covering breakdowns, electrical failures and Freon gas leaks — 100 EGP per month for up to two years. Pay via InstaPay or Vodafone Cash.' }
];

// Special option shown ONLY on product orders. When picked, the customer types
// their own place in a text box (repair bookings never show it).
const OTHER_AREA = 'Other Area';

// Default service areas. The head admin / admin can add or remove areas at any
// time from the admin dashboard ("Service Areas" card) — the saved list lives in
// localStorage under 'ca_areas' and replaces these defaults.
const INITIAL_AREAS = [
    { name: 'Faisal', nameAr: 'فيصل' },
    { name: 'Haram', nameAr: 'الهرم' },
    { name: '6th of October', nameAr: '6 أكتوبر' },
    { name: 'Sheikh Zayed', nameAr: 'الشيخ زايد' },
    { name: 'Dokki', nameAr: 'الدقي' },
    { name: 'Mohandessin', nameAr: 'المهندسين' },
    { name: 'Maadi', nameAr: 'المعادي' },
    { name: 'Nasr City', nameAr: 'مدينة نصر' },
    { name: 'Heliopolis', nameAr: 'مصر الجديدة' },
    { name: 'New Cairo', nameAr: 'القاهرة الجديدة' },
    { name: 'Downtown Cairo', nameAr: 'وسط البلد' },
    { name: 'Mokattam', nameAr: 'المقطم' }
];

// true  = customers MUST share their GPS location OR type their address before an order/repair can be placed
// false = location/address is optional
const REQUIRE_LOCATION_SHARE = true;

function loadAreas() {
    try {
        const stored = JSON.parse(localStorage.getItem('ca_areas'));
        if (Array.isArray(stored)) return stored.filter(a => a && a.name);
    } catch (e) { /* fall through to defaults */ }
    return INITIAL_AREAS.map(a => ({ ...a }));
}

function loadAboutVideos() {
    try {
        const stored = JSON.parse(localStorage.getItem('ca_about_videos'));
        if (Array.isArray(stored)) return stored.filter(v => v && v.url);
    } catch (e) { /* no saved videos yet */ }
    return [];
}

const INITIAL_TASKS = [];

const ADMIN_EMAIL = 'moayadahmed922@gmail.com';

// ---------- Password hashing (SHA-256 + app pepper) ----------
// NOTE: this is a fully client-side app with no backend/server, so passwords
// can never be truly "secret" from someone who controls the browser (they can
// always read localStorage / memory). What this DOES fix: passwords no longer
// sit in the page source or localStorage as plain, human-readable text — they
// are stored as a salted SHA-256 hash instead, so opening dev tools or the
// source code no longer just hands someone a working password.
//
// This is a pure-JS SHA-256 (not the browser's Web Crypto API) on purpose:
// crypto.subtle only works in a "secure context" (https:// or localhost), and
// this app is opened over file:// / plain http in some setups — Web Crypto
// would silently be undefined there and break every login/signup.
const PASSWORD_PEPPER = 'CoolingArt::';
function sha256Hex(message) {
    function rightRotate(v, n) { return (v >>> n) | (v << (32 - n)); }
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

    const utf8 = unescape(encodeURIComponent(message));
    const len = utf8.length;
    const bitLen = len * 8;
    let withOne = utf8 + String.fromCharCode(0x80);
    while (withOne.length % 64 !== 56) withOne += String.fromCharCode(0);
    for (let i = 7; i >= 0; i--) {
        withOne += String.fromCharCode((i >= 4) ? 0 : (bitLen >>> (8 * i)) & 0xff);
    }

    const words = [];
    for (let i = 0; i < withOne.length; i += 4) {
        words.push(
            (withOne.charCodeAt(i) << 24) |
            (withOne.charCodeAt(i + 1) << 16) |
            (withOne.charCodeAt(i + 2) << 8) |
            (withOne.charCodeAt(i + 3))
        );
    }

    for (let chunkStart = 0; chunkStart < words.length; chunkStart += 16) {
        const w = new Array(64);
        for (let i = 0; i < 16; i++) w[i] = words[chunkStart + i];
        for (let i = 16; i < 64; i++) {
            const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
            const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) | 0;
            h = g; g = f; f = e; e = (d + temp1) | 0;
            d = c; c = b; b = a; a = (temp1 + temp2) | 0;
        }
        H = [H[0] + a | 0, H[1] + b | 0, H[2] + c | 0, H[3] + d | 0, H[4] + e | 0, H[5] + f | 0, H[6] + g | 0, H[7] + h | 0];
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
async function hashPassword(rawPassword) {
    return sha256Hex(PASSWORD_PEPPER + rawPassword);
}

function createDateBasedId(prefix) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomDigits = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
    return `${prefix}-${year}${month}${day}-${randomDigits}`;
}

// ---------- Small shared helpers ----------
// Inline English/Arabic picker for messages built in code.
function L(en, ar) {
    return state.currentLang === 'ar' ? ar : en;
}

function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Today's date (YYYY-MM-DD) in the device's LOCAL time zone.
// (toISOString() returns the UTC date, which is wrong for Cairo late at night.)
function getLocalDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Formats a stored timestamp (ISO string) as local date + time, e.g. "19 Sep 2026, 6:24 pm".
// Older records that only have a date (YYYY-MM-DD) are shown as a date only.
function formatDateTime(value) {
    if (!value) return 'N/A';
    const locale = state.currentLang === 'ar' ? 'ar-EG' : 'en-GB';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

// Real Date object for when a task was finished (works for old and new records).
function getTaskCompletionDate(task) {
    if (task.completedAt) return new Date(task.completedAt);
    if (task.completedDate) {
        const [y, m, d] = String(task.completedDate).split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return null;
}

function buildMapsUrl(coords) {
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') return '';
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}

function renderMapLink(coords) {
    const url = buildMapsUrl(coords);
    if (!url) return '';
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 mt-1 text-[10px] font-extrabold uppercase text-sky-600 dark:text-sky-400 hover:underline"><i class="fa-solid fa-location-dot"></i> ${L('Open in Maps', 'فتح الخريطة')}</a>`;
}

// ---------- "Late" = an Open task (unassigned, or assigned but not yet accepted
// by the technician) that has been waiting more than 4 hours ----------
const LATE_AFTER_MS = 4 * 60 * 60 * 1000;

// Short "how long ago" chip (e.g. "2h ago", "3d ago") used on the technician
// home cards so the oldest-first ordering is visible, not just implied.
function formatElapsed(date) {
    if (!date) return '';
    const ms = Date.now() - date.getTime();
    if (ms < 0) return '';
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return L('Just now', 'الآن');
    if (mins < 60) return L(`${mins}m ago`, `منذ ${mins} د`);
    const hours = Math.floor(mins / 60);
    if (hours < 24) return L(`${hours}h ago`, `منذ ${hours} س`);
    const days = Math.floor(hours / 24);
    return L(`${days}d ago`, `منذ ${days} يوم`);
}
let taskBoardSignature = ''; // counters + open-task count shown at the last render

// ---------- Job phases (repair chain) ----------
// repair   = technician working in place (customer's location)
// replace  = a piece is needed -> new task for another technician
// withdraw = unit is taken away -> new task to pick it up
// return   = repaired unit goes back to the customer
const PHASE_LABELS = {
    repair: ['Repair (In Place)', 'صيانة في الموقع'],
    replace: ['Replace Piece', 'استبدال قطعة'],
    withdraw: ['Withdraw – Get It', 'سحب الوحدة – استلامها'],
    workshop: ['Fix in Workshop', 'إصلاح في الورشة'],
    return: ['Need to Get It Back', 'بحاجة لاستلامها'],
    unit: ['New Unit Order', 'طلب وحدة جديدة']
};
// Which phases a technician can send the job to from the current one.
// First step (repair): Done (finished) OR replace (assigned to a new tech, ends with Done)
// OR withdraw. Withdraw chain: withdraw -> workshop -> return, each hand-off
// returns an unassigned task to the board; the return step ends with Done.
const PHASE_NEXT = { repair: ['replace', 'withdraw'], withdraw: ['workshop'], workshop: ['return'] };

function getTaskPhase(task) {
    return task.phase || (task.orderType === 'Tech Fix Service' ? 'repair' : 'unit');
}

function getPhaseLabel(phase) {
    const p = PHASE_LABELS[phase] || PHASE_LABELS.repair;
    return L(p[0], p[1]);
}

const TASK_COUNTERS = [
    { key: 'unassigned', en: 'Not Assigned', ar: 'غير معيّن', color: 'text-yellow-500', icon: 'fa-user-clock', match: t => isTaskUnassigned(t) },
    { key: 'awaiting', en: 'Assigned but Not Accepted', ar: 'معيّنة – لم تُقبل بعد', color: 'text-orange-500', icon: 'fa-hourglass-half', match: t => !isTaskUnassigned(t) && t.status === 'Open' },
    { key: 'late', en: 'Late', ar: 'متأخر', color: 'text-red-500', icon: 'fa-triangle-exclamation', match: t => isTaskLate(t) },
    { key: 'replace', en: 'Replace Piece', ar: 'استبدال قطعة', color: 'text-rose-500', icon: 'fa-gears', match: t => getTaskPhase(t) === 'replace' },
    { key: 'workshop', en: 'Fix in Workshop', ar: 'إصلاح في الورشة', color: 'text-violet-500', icon: 'fa-industry', match: t => getTaskPhase(t) === 'workshop' },
    { key: 'withdraw', en: 'Withdraw Get It', ar: 'سحب – استلام', color: 'text-amber-600', icon: 'fa-truck-ramp-box', match: t => getTaskPhase(t) === 'withdraw' },
    { key: 'getBack', en: 'Get Back', ar: 'إرجاع الوحدة', color: 'text-emerald-500', icon: 'fa-truck-fast', match: t => getTaskPhase(t) === 'return' },
    { key: 'units', en: 'Unit Orders', ar: 'طلبات الوحدات', color: 'text-cyan-500', icon: 'fa-box', match: t => getTaskPhase(t) === 'unit' }
];
let activeTaskCounter = null; // which counter's list is open below the counters

function getTasksForCounter(key) {
    const def = TASK_COUNTERS.find(d => d.key === key);
    return def ? state.tasks.filter(t => t.status !== 'Done' && def.match(t)) : [];
}

function getTaskCounts() {
    const counts = { open: state.tasks.filter(t => t.status !== 'Done').length };
    TASK_COUNTERS.forEach(d => { counts[d.key] = getTasksForCounter(d.key).length; });
    return counts;
}

function getTaskBoardSignature() {
    return JSON.stringify(getTaskCounts());
}

// Click a counter to open its list below; click it again (or Close) to hide it.
function setTaskFilter(key) {
    activeTaskCounter = (activeTaskCounter === key) ? null : key;
    renderAdminDashboard();
}

function renderTaskCounters() {
    const c = getTaskCounts();
    return TASK_COUNTERS.map(d => {
        const active = activeTaskCounter === d.key;
        return `
        <button type="button" onclick="setTaskFilter('${d.key}')" aria-pressed="${active}"
            class="text-start rounded-xl border px-5 py-4 transition hover:border-sky-400 ${active ? 'border-sky-500 ring-2 ring-sky-400/40 bg-sky-50 dark:bg-sky-950/30' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'}">
            <span class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase"><i class="fa-solid ${d.icon} ${d.color} text-base"></i>${L(d.en, d.ar)}</span>
            <span class="block text-3xl font-extrabold mt-1 ${c[d.key] ? d.color : 'text-slate-300 dark:text-slate-600'}">${c[d.key]}</span>
        </button>`;
    }).join('');
}

// What the customer/order should show for a task in a given status.

function getOrderStatusForTask(task, taskStatus) {
    const phase = getTaskPhase(task);
    if (taskStatus === 'Done') return 'Delivered';
    if (phase === 'return' || phase === 'withdraw') return 'On The Way';
    if (taskStatus === 'In Progress') return 'In Progress';
    if (phase === 'repair') return 'Inspection Requested';
    if (phase === 'unit') return 'Pending Dispatch';
    return 'In Progress'; // replace / withdraw waiting for a technician still reads as in progress
}

// When the task started waiting: for an unassigned task, since it became unassigned
// (creation, or the last decline); for an assigned-but-not-yet-accepted task, since
// it was assigned to the technician — that's the clock the 4-hour "late" rule uses.
function getTaskWaitingSince(task) {
    const order = task.orderId ? state.orders.find(o => o.id === task.orderId) : null;
    const value = (task.assignedTo && task.assignedAt)
        ? task.assignedAt
        : (task.unassignedSince || task.createdAt || (order && order.createdAt) || task.createdDate);
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

// A task counts as "not assigned" when nobody is on it, or the technician on it no longer exists.
function isTaskUnassigned(task) {
    if (!task.assignedTo) return true;
    return !state.users.some(u => u.username === task.assignedTo && u.role === 'technician');
}

// Removes orders (and the tasks that belong to them). Used when a customer or order is deleted.
function purgeOrders(shouldRemove) {
    const removed = new Set(state.orders.filter(shouldRemove).map(o => o.id));
    if (!removed.size) return false;
    state.orders = state.orders.filter(o => !removed.has(o.id));
    state.tasks = state.tasks.filter(t => !removed.has(t.orderId));
    return true;
}

// Cleans up leftovers of customers deleted earlier: their orders, and tasks whose order is gone.
function purgeOrphans() {
    const names = new Set(state.users.map(u => u.username.toLowerCase()));
    let changed = purgeOrders(o => o.username && !names.has(String(o.username).toLowerCase()));
    const ids = new Set(state.orders.map(o => o.id));
    const before = state.tasks.length;
    state.tasks = state.tasks.filter(t => !t.orderId || ids.has(t.orderId));
    return changed || state.tasks.length !== before;
}

function isTaskLate(task) {
    // Once a technician has accepted it (In Progress) or it's Done, it's never "late" —
    // only a task still sitting Open (unassigned, or assigned but not accepted yet)
    // past the 4-hour window turns late/red.
    if (task.status !== 'Open') return false;
    const since = getTaskWaitingSince(task);
    return !!since && (Date.now() - since.getTime()) > LATE_AFTER_MS;
}

// Runs every few seconds: re-draws the admin task board only when a task has just become late.
function checkLateTasks() {
    if (!state.currentUser || getCurrentViewId() !== 'admin-dashboard') return;
    if (!isTopAdmin(state.currentUser.role) && state.currentUser.role !== 'hr') return;
    state.tasks = JSON.parse(localStorage.getItem('ca_tasks')) || state.tasks;
    state.orders = JSON.parse(localStorage.getItem('ca_orders')) || state.orders;
    if (getTaskBoardSignature() !== taskBoardSignature) renderAdminDashboard();
}

// Where the job is: area name + GPS pin. Falls back to the linked order for
// older tasks that were created before the pin was copied onto the task.
function getTaskLocation(task) {
    const order = task.orderId ? state.orders.find(o => o.id === task.orderId) : null;
    return {
        label: order ? (order.location || '') : '',
        coords: task.locationCoords || (order && order.locationCoords) || null
    };
}

// Money the technician collected on site (repairs only). It only counts while the job is
// Done, so undoing "Done" also takes it out of the revenue.
function getCollectedAmount(order) {
    return state.tasks
        .filter(t => t.orderId === order.id && t.status === 'Done' && t.orderType === 'Tech Fix Service')
        .reduce((sum, t) => sum + (Number(t.amountReceived) || 0), 0);
}

// Upfront payment + money the technician collected from the customer.
function getOrderRevenue(order) {
    return (Number(order.amount) || 0) + getCollectedAmount(order);
}

// "Received from customer" line for a finished repair (unit orders don't collect money on site).
function renderReceivedLine(task) {
    if (task.orderType !== 'Tech Fix Service') return '';
    if (task.status !== 'Done' || task.amountReceived === undefined || task.amountReceived === null) return '';
    const method = task.paymentMethod ? ` ${L('via', 'عبر')} ${task.paymentMethod === 'Cash' ? L('Cash', 'نقدي') : task.paymentMethod}` : '';
    return `<span class="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">${L('Received from customer', 'المبلغ المستلم من العميل')}: ${Number(task.amountReceived).toLocaleString()} EGP${method}</span>`;
}

// Read-only star row (supports half stars, used for averages).
function renderStarRow(value, sizeClass = 'text-sm') {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        let icon = 'fa-regular fa-star text-slate-300 dark:text-slate-600';
        if (value >= i - 0.25) icon = 'fa-solid fa-star text-amber-400';
        else if (value >= i - 0.75) icon = 'fa-solid fa-star-half-stroke text-amber-400';
        html += `<i class="${icon}"></i>`;
    }
    return `<span class="inline-flex gap-0.5 ${sizeClass}">${html}</span>`;
}

function getRoleLabel(role) {
    if (state.currentLang === 'ar') {
        if (role === 'executive') return 'المدير التنفيذي';
        if (role === 'head-admin') return 'المسؤول الرئيسي';
        if (role === 'admin') return 'مسؤول';
        if (role === 'hr') return 'خدمة العملاء';
        if (role === 'technician') return 'فني صيانة';
        return 'عميل';
    }
    if (role === 'executive') return 'Executive Director';
    if (role === 'head-admin') return 'Head Admin';
    if (role === 'admin') return 'Admin';
    if (role === 'hr') return 'Customer Services';
    if (role === 'technician') return 'Technician';
    return 'Customer';
}

// Job title used specifically for the "Who Are We" hierarchy dump
function getHierarchyJobTitle(role) {
    if (state.currentLang === 'ar') {
        if (role === 'executive') return 'المدير التنفيذي';
        if (role === 'head-admin') return 'رئيس الهيكل';
        if (role === 'hr') return 'خدمة العملاء';
        if (role === 'technician') return 'فني صيانة';
        if (role === 'admin') return 'مسؤول';
        return 'عميل';
    }
    if (role === 'executive') return 'Executive Director';
    if (role === 'head-admin') return 'Head';
    if (role === 'hr') return 'Customer Services';
    if (role === 'technician') return 'Technician';
    if (role === 'admin') return 'Admin';
    return 'Customer';
}

// Any account that is part of the internal staff/management structure
function isStaffRole(role) {
    return role === 'head-admin' || role === 'executive' || role === 'admin' || role === 'hr' || role === 'technician';
}

// Top-level management: the Admin (head-admin) and the Executive Director work side by side and
// share the same access and visibility across the whole website.
function isTopAdmin(role) {
    return role === 'head-admin' || role === 'executive';
}

// ---- Employee categories & positions (used by the "Add Employee" form) ----
// Each category maps to one permission role, so the existing access rules keep working:
//   Technical        -> role 'technician' (technician workspace & task assignment)
//   Customer Service -> role 'hr'         (customer chats, task board, customer log)
// The exact job title is saved on the account as `position`.
const STAFF_CATEGORIES = {
    'technical': {
        role: 'technician',
        en: 'Technical', ar: 'الفريق الفني',
        positions: [
            { key: 'technical-manager', en: 'Technical Manager', ar: 'مدير فني' },
            { key: 'area-supervisor', en: 'Area Supervisor', ar: 'مشرف منطقة' },
            { key: 'technician', en: 'Technician', ar: 'فني صيانة' },
            { key: 'assistant', en: 'Assistant', ar: 'مساعد' }
        ]
    },
    'customer-service': {
        role: 'hr',
        en: 'Customer Service', ar: 'خدمة العملاء',
        positions: [
            { key: 'administrative-manager', en: 'Administrative Manager', ar: 'مدير إداري' },
            { key: 'customer-service-representative', en: 'Customer Service Representative', ar: 'ممثل خدمة العملاء' },
            { key: 'financial-manager', en: 'Financial Manager', ar: 'مدير مالي' },
            { key: 'accountant', en: 'Accountant', ar: 'محاسب' }
        ]
    }
};

// The job title shown for an employee (falls back to the generic role label for older accounts
// that were created before positions existed).
function getPositionLabel(user) {
    if (!user) return getRoleLabel('customer');
    if (user.role === 'executive') return getRoleLabel('executive');
    const cat = Object.values(STAFF_CATEGORIES).find(c => c.role === user.role);
    const pos = cat && cat.positions.find(p => p.key === user.position);
    if (pos) return state.currentLang === 'ar' ? pos.ar : pos.en;
    return getRoleLabel(user.role);
}

function getAdminUsers() {
    return state.users.filter(user => isStaffRole(user.role));
}

function getAssignabledAdmins() {
    return state.users.filter(user => user.role === 'admin' || user.role === 'hr' || user.role === 'technician');
}

function getCurrentUserId() {
    if (state.currentUser && state.currentUser.id) {
        return state.currentUser.id;
    }
    if (state.currentUser && state.currentUser.username) {
        const found = state.users.find(u => u.username && u.username.toLowerCase() === state.currentUser.username.toLowerCase());
        if (found && found.id) {
            state.currentUser.id = found.id;
            saveState();
            return found.id;
        }
    }
    return 'USR-GUEST';
}

// SILENT BACKGROUND ADMIN NOTIFICATION DISPATCH
// No customer-facing toasts are displayed here.
// Dispatches via EmailJS (if configured), FormSubmit AJAX API, and
// dynamic hidden iframe POST (ensures delivery even when browsed via file://)
async function sendAutomatedAdminNotification(order) {
    const userId = order.userId || getCurrentUserId();
    const unitOrdered = order.itemTitle || 'N/A';
    const location = order.location || 'N/A';
    const customerName = order.customerName || order.username || 'Valued Customer';
    const customerUsername = order.username ? `@${order.username}` : 'N/A';
    const isRepair = order.type === 'Tech Fix Service';

    const subject = isRepair
        ? `🛠️ New Repair Booking: ${unitOrdered} (Location: ${location})`
        : `🚨 Purchase Confirmed: ${unitOrdered} (User: ${userId})`;

    // Structured payload
    const payload = {
        _subject: subject,
        _template: "table",
        _captcha: "false",
        "Notification Type": isRepair ? "Repair Booking Request" : (order.type || "Product Order Confirmation"),
        "User ID": userId,
        "Customer Username": customerUsername,
        "Customer Full Name": customerName,
        "Unit / Service": unitOrdered,
        "Service / Delivery Location": location,
        "Shared GPS Location": order.locationCoords ? buildMapsUrl(order.locationCoords) : 'Not shared',
        "Order ID": order.id,
        "Order Type": order.type || 'Product Order',
        "Total Amount": order.amount ? `${Number(order.amount).toLocaleString()} EGP` : 'Inspection / Free Quote',
        "Payment Method & Reference": order.gateway || 'Pending Payment',
        "Customer Contact Phone": order.customerContactPhone || 'Not provided',
        "Customer WhatsApp": order.customerWhatsApp || 'Not provided',
        "Order Date": order.date || getLocalDateString(),
        "Timestamp": new Date().toLocaleString()
    };

    console.log('[CoolingArt] Sending automated admin notification:', ADMIN_EMAIL, payload);

    let sentViaEmailJs = false;

    // 1. Optional EmailJS dispatch
    try {
        const emailjsConfig = JSON.parse(localStorage.getItem('ca_emailjs_config') || 'null');
        if (window.emailjs && emailjsConfig && emailjsConfig.serviceId && emailjsConfig.templateId && emailjsConfig.publicKey) {
            emailjs.init(emailjsConfig.publicKey);
            await emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
                to_email: ADMIN_EMAIL,
                subject: subject,
                user_id: userId,
                unit_ordered: unitOrdered,
                location: location,
                map_link: order.locationCoords ? buildMapsUrl(order.locationCoords) : '',
                customer_name: customerName,
                customer_username: customerUsername,
                order_id: order.id,
                amount: order.amount ? `${Number(order.amount).toLocaleString()} EGP` : 'Inspection / Quote',
                gateway: order.gateway || '',
                phone: order.customerContactPhone || '',
                whatsapp: order.customerWhatsApp || '',
                date: order.date || ''
            });
            sentViaEmailJs = true;
            console.log('[CoolingArt] Automated email dispatched via EmailJS.');
        }
    } catch (e) {
        console.warn('[CoolingArt] EmailJS dispatch skipped or error:', e);
    }

    // 2. FormSubmit AJAX API (active on web servers / http / https)
    if (!sentViaEmailJs) {
        try {
            const response = await fetch(`https://formsubmit.co/ajax/${ADMIN_EMAIL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => null);
            console.log('[CoolingArt] FormSubmit AJAX response:', data);
        } catch (err) {
            console.warn('[CoolingArt] FormSubmit AJAX request bypassed or failed (expected on file:// url):', err);
        }

        // 3. FormSubmit Silent Hidden Form Post (works across file:// and all origins)
        try {
            dispatchHiddenFormSubmit(ADMIN_EMAIL, payload);
        } catch (e) {
            console.warn('[CoolingArt] Hidden form dispatch fallback error:', e);
        }
    }
}

// Fallback hidden form dispatcher: posts payload to FormSubmit through hidden iframe
// to bypass browser CORS / file:// fetch origin barriers
function dispatchHiddenFormSubmit(toEmail, payload) {
    let iframe = document.getElementById('coolingart_email_frame');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.name = 'coolingart_email_frame';
        iframe.id = 'coolingart_email_frame';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `https://formsubmit.co/${toEmail}`;
    form.target = 'coolingart_email_frame';
    form.style.display = 'none';

    for (const [key, value] of Object.entries(payload)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
        form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => {
        if (form.parentNode) form.parentNode.removeChild(form);
    }, 2500);
    console.log('[CoolingArt] Hidden form dispatch successfully posted to FormSubmit.');
}

async function testAdminEmailDelivery() {
    showToast(state.currentLang === 'ar' ? 'جاري إرسال بريد تجريبي للإدارة...' : 'Sending test email to admin...', 'info');
    const testOrder = {
        id: createDateBasedId('TEST'),
        itemTitle: 'Test AC Unit Diagnostic Visit',
        location: 'Dokki',
        amount: 0,
        type: 'Tech Fix Service',
        gateway: 'On-Site Diagnostic',
        username: state.currentUser ? state.currentUser.username : 'admin',
        customerName: state.currentUser ? state.currentUser.name : 'System Admin',
        customerContactPhone: state.currentUser ? state.currentUser.contactPhone : '01012345678',
        customerWhatsApp: state.currentUser ? state.currentUser.whatsapp : '01012345678',
        date: getLocalDateString()
    };
    await sendAutomatedAdminNotification(testOrder);
    showToast(state.currentLang === 'ar'
        ? `تم إرسال الإشعار إلى ${ADMIN_EMAIL}! تفقّد بريدك (ورابط التفعيل إن كان أول استخدام).`
        : `Notification sent to ${ADMIN_EMAIL}! Check your inbox (and activation link if first time).`, 'success');
}

function notifyAdminAboutOrder(order) {
    // Non-blocking automated background delivery
    sendAutomatedAdminNotification(order);
}
// NOTE: Customer Services and Technician staff are NO LONGER hardcoded here. The head admin creates
// those accounts from the admin dashboard ("Create Staff Account") so they are never
// forced through the public customer signup form.
// Passwords below are SHA-256(pepper + "123") — see hashPassword(). Default
// password for every seed account is still "123", it just no longer appears
// as plain text in the source.
const DEFAULT_PW_HASH = 'e97e6017ebed84a81c9a631d9737bfe67e97f15f31dfd76b8c68e077cd30453c';
const INITIAL_USERS = [
    { id: 'USR-20260911000001', username: 'admin', password: DEFAULT_PW_HASH, role: 'head-admin', name: 'Eng. Ahmed', whatsapp: '+20 100 000 0000', contactPhone: '+20 100 000 0000', joinedDate: '2026-01-01' },
    { id: 'USR-20260911000006', username: 'ahmed', password: DEFAULT_PW_HASH, role: 'customer', name: 'Ahmed Hassan', whatsapp: '+20 101 234 5678', contactPhone: '+20 101 234 5678', joinedDate: '2026-08-15' },
    { id: 'USR-20260911000007', username: 'coco', password: DEFAULT_PW_HASH, role: 'customer', name: 'Coco', whatsapp: '+20 106 587 6092', contactPhone: '+20 106 587 6092', joinedDate: '2026-09-01' },
    // Without at least one 'hr' (Customer Services) account, the "Chat with CS" bot flow
    // has no one to round-robin-assign to and always reports "no agent available".
    { id: 'USR-20260911000008', username: 'cs1', password: DEFAULT_PW_HASH, role: 'hr', name: 'Mona Samir', whatsapp: '+20 111 222 3344', contactPhone: '+20 111 222 3344', joinedDate: '2026-01-05' }
];

const INITIAL_ORDERS = [
    {
        id: 'INS-591',
        date: '2026-09-07',
        userId: 'USR-20260911000007',
        username: 'coco',
        itemTitle: 'Monthly Protection Insurance (#5245)',
        amount: 100,
        type: 'Insurance',
        insurancePaid: '100 EGP / Month',
        gateway: 'Vodafone Cash (Ref: 01065876092)',
        status: 'Active / Verified'
    },
    {
        id: 'ORD-771',
        date: '2026-09-01',
        userId: 'USR-20260911000006',
        username: 'ahmed',
        itemTitle: 'Carrier Inverter 2.25 HP Split AC',
        amount: 28500,
        type: 'Product',
        insurancePaid: 'No',
        gateway: 'Card',
        status: 'Completed'
    },
    {
        id: 'INS-902',
        date: '2026-09-05',
        userId: 'USR-20260911000006',
        username: 'ahmed',
        itemTitle: 'Monthly Unit Protection Insurance',
        amount: 100,
        type: 'Insurance',
        insurancePaid: '100 EGP / Month',
        gateway: 'InstaPay (Ref: INSTA-8821)',
        status: 'Active / Verified'
    }
];

let state = {
    users: JSON.parse(localStorage.getItem('ca_users')) || INITIAL_USERS,
    products: JSON.parse(localStorage.getItem('ca_products')) || INITIAL_PRODUCTS,
    services: JSON.parse(localStorage.getItem('ca_services')) || INITIAL_TECH_SERVICES,
    orders: JSON.parse(localStorage.getItem('ca_orders')) || INITIAL_ORDERS,
    tasks: JSON.parse(localStorage.getItem('ca_tasks')) || INITIAL_TASKS,
    areas: loadAreas(),
    aboutVideos: loadAboutVideos(),
    // The logged-in user is kept per browser TAB (sessionStorage), not in localStorage, so signing in
    // as someone else in another tab can never switch the account of this tab on refresh.
    currentUser: loadSessionUser(),
    authMode: 'login',
    currentLang: localStorage.getItem('ca_lang') || 'en',
    revenueResetBaseline: Number(localStorage.getItem('ca_revenue_reset_baseline') || 0)
};

// Ensure users have unique IDs
state.users.forEach((u, idx) => {
    if (!u.id) u.id = `USR-20260911` + String(idx + 1).padStart(6, '0');
});
if (state.currentUser && !state.currentUser.id) {
    const matched = state.users.find(u => u.username && u.username.toLowerCase() === state.currentUser.username.toLowerCase());
    state.currentUser.id = matched ? matched.id : createDateBasedId('USR');
}
// Ensure all orders have userId backfilled
state.orders.forEach(o => {
    if (!o.userId && o.username) {
        const u = state.users.find(user => user.username && user.username.toLowerCase() === o.username.toLowerCase());
        if (u && u.id) o.userId = u.id;
    }
});

// Auto update admin name if stored as "System Administrator" in existing local Storage
if (state.currentUser && state.currentUser.role === 'admin' && state.currentUser.name === 'System Administrator') {
    state.currentUser.name = 'System Admin';
}
state.users.forEach(u => {
    if (u.role === 'admin' && u.name === 'System Administrator') {
        u.name = 'System Admin';
    }
});
// Head admin is now "Eng. Ahmed" — rename any browser that still has an old/different
// name stored for the head-admin account (e.g. "System Admin" or a previously edited name).
state.users.forEach(u => {
    if (u.role === 'head-admin' && u.name !== 'Eng. Ahmed') {
        u.name = 'Eng. Ahmed';
    }
});
if (state.currentUser && state.currentUser.role === 'head-admin' && state.currentUser.name !== 'Eng. Ahmed') {
    state.currentUser.name = 'Eng. Ahmed';
}
// One-time migration: any account still storing a plain-text password (not a 64-char
// hex SHA-256 hash) gets upgraded to a hash automatically, next time it's touched.
const HEX64 = /^[a-f0-9]{64}$/;
let needsPasswordMigration = state.users.some(u => u.password && !HEX64.test(u.password));
if (needsPasswordMigration) {
    Promise.all(state.users.map(async u => {
        if (u.password && !HEX64.test(u.password)) {
            u.password = await hashPassword(u.password);
        }
    })).then(() => saveState());
}

// The Insurance page was removed — insurance is now a repair service, so make
// sure the service exists even in browsers that already stored older data.
if (!state.services.some(s => s.id === 's5')) {
    state.services.push({ id: 's5', name: 'Cooling Art Protection Insurance', price: 100, desc: 'Monthly protection plan covering breakdowns, electrical failures and Freon gas leaks — 100 EGP per month for up to two years. Pay via InstaPay or Vodafone Cash.', image: '' });
    saveState();
}

let userToDeleteId = null;

function saveState() {
    localStorage.setItem('ca_users', JSON.stringify(state.users));
    localStorage.setItem('ca_products', JSON.stringify(state.products));
    localStorage.setItem('ca_services', JSON.stringify(state.services));
    localStorage.setItem('ca_orders', JSON.stringify(state.orders));
    localStorage.setItem('ca_tasks', JSON.stringify(state.tasks));
    localStorage.setItem('ca_areas', JSON.stringify(state.areas));
    localStorage.setItem('ca_about_videos', JSON.stringify(state.aboutVideos || []));
    try { sessionStorage.setItem('ca_current_user', JSON.stringify(state.currentUser)); } catch (e) { /* storage unavailable */ }
    localStorage.setItem('ca_revenue_reset_baseline', String(state.revenueResetBaseline || 0));

    // Auto-sync orders to Supabase Database in the background
    debounceSyncOrdersToSupabase();
}

let syncOrdersTimeout = null;
function debounceSyncOrdersToSupabase() {
    if (syncOrdersTimeout) clearTimeout(syncOrdersTimeout);
    syncOrdersTimeout = setTimeout(() => {
        syncOrdersToSupabase(false);
    }, 2000);
}

// Syncs all orders & repair requests to Supabase table "orders_and_services"
async function syncOrdersToSupabase(showNotification = false) {
    if (!supabaseClient) {
        if (showNotification) showToast('Supabase SDK not connected.', 'error');
        return;
    }
    if (!state.orders || state.orders.length === 0) {
        if (showNotification) showToast(L('No orders found to back up.', 'لا توجد طلبات للنسخ الاحتياطي.'), 'info');
        return;
    }
    try {
        const payload = state.orders.map(o => {
            const customerUser = state.users.find(u => u.username.toLowerCase() === (o.username || '').toLowerCase());
            const task = state.tasks.find(t => t.orderId === o.id);
            return {
                id: o.id,
                order_ref: o.id,
                status: o.status || 'Pending',
                date: o.date || '',
                type: o.type || 'Product',
                username: o.username || '',
                customer_name: customerUser ? (customerUser.name || o.username) : o.username,
                customer_phone: customerUser ? (customerUser.contactPhone || customerUser.whatsapp || '') : '',
                item_title: o.itemTitle || '',
                amount: o.amount || 0,
                gateway: o.gateway || '',
                location: o.location || '',
                customer_address: o.customerAddress || '',
                assigned_tech: task ? task.assignedTo : '',
                notes: o.notes || '',
                rating: o.customerFeedback ? o.customerFeedback.rating : null,
                feedback: o.customerFeedback ? o.customerFeedback.text : null,
                updated_at: new Date().toISOString()
            };
        });

        const { error } = await supabaseClient
            .from('orders_and_services')
            .upsert(payload, { onConflict: 'id', returning: 'minimal' });

        if (error) {
            console.warn('[Supabase Sync] Error during orders backup:', error.message, error);
            if (showNotification) {
                // Detect RLS / permission errors specifically
                const isRLS = error.message && (error.message.includes('permission denied') || error.code === '42501');
                if (isRLS) {
                    showToast('⚠️ Supabase RLS is blocking the backup. Go to Supabase → Table Editor → orders_and_services → RLS → Disable RLS (or add an INSERT policy for the anon role).', 'error', 8000);
                } else {
                    showToast(`Backup error: ${error.message}`, 'error');
                }
            }
        } else {
            console.log('[Supabase Sync] Successfully backed up orders to Supabase DB table "orders_and_services"');
            if (showNotification) showToast(L(`✅ Backed up ${payload.length} orders to Supabase!`, `✅ تم النسخ الاحتياطي لـ ${payload.length} طلب على Supabase!`), 'success');
        }
    } catch (err) {
        console.warn('[Supabase Sync] Exception during sync:', err);
        if (showNotification) showToast('Supabase connection error. Check console for details.', 'error');
    }
}
window.syncOrdersToSupabase = syncOrdersToSupabase;

// ================= INTERNATIONALIZATION (i18n) DICTIONARY =================
const TRANSLATIONS = {
    en: {
        nav_home: "Home",
        nav_dashboard: "Dashboard",
        nav_dashboard_text: "Dashboard",
        nav_products: "Products",
        nav_tech_fix: "Repairs",
        nav_insurance: "Insurance",
        nav_about: "Policies",
        nav_reviews: "Ratings",
        reviews_title: "Ratings & Videos",
        reviews_desc: "What our customers say about us, and a look at how we work.",
        nav_who_are_we: "Who Are We",
        nav_contact: "Contact Us",
        lang_toggle_label: "عربي",
        role_head_admin: "Head Admin",
        role_executive: "Executive Director",
        role_admin: "Admin",
        role_hr: "Customer Services",
        role_technician: "Technician",
        role_customer: "Customer",
        head_badge: "Head",
        hero_tagline: "Egypt's #1 Climate Control Specialists",
        hero_title_1: "Mastering the Art of ",
        hero_title_2: "Pure Cooling.",
        home_svc_products_t: "Premium AC Units",
        home_svc_products_d: "High-efficiency inverter split, central and portable units from trusted brands.",
        home_svc_repairs_t: "Fast Technical Fix",
        home_svc_repairs_d: "Certified engineers for repairs, Freon refills, deep cleaning and re-installation.",
        home_svc_insurance_t: "Protection Insurance",
        home_svc_insurance_d: "Extend your unit's coverage for just EGP 100 a month, for up to two years.",
        home_link_explore: "Explore",
        home_trust_1: "Al-Araby authorized service center",
        home_trust_2: "24-hour emergency repairs",
        home_trust_3: "Pay via InstaPay or Vodafone Cash",
        home_trust_4: "Free seasonal maintenance with insurance",
        hero_desc: "Purchase high-efficiency AC units, request instant technical repairs, and protect your units with our monthly Insurance Protection Plan via InstaPay or Vodafone Cash.",
        btn_explore_ac: "Explore AC Units",
        btn_book_fix: "Book Technical Fix",
        btn_insurance_plan: "Insurance Plan",
        products_title: "Air Conditioning Products",
        products_subtitle: "High performance residential and commercial cooling units",
        search_products_placeholder: "Search AC models...",
        btn_order_unit: "Order Unit",
        price_label: "Price",
        egp_symbol: "EGP",
        tech_fix_title: "Technical Fix & Repair Support",
        tech_fix_subtitle: "Professional maintenance, Freon refills, and emergency repairs by certified Cooling Art engineers",
        btn_book_repair: "Book Repair",
        insurance_title: "Cooling Art Protection Insurance",
        insurance_subtitle: "Protect your AC units against unexpected breakdowns, electrical failures, and Freon gas leaks. Pay your monthly insurance premium instantly using InstaPay or Vodafone Cash.",
        pay_insurance_title: "Pay Monthly Insurance",
        select_gateway: "Select Payment Gateway",
        instapay_desc: "Instant Bank Transfer",
        vodafone_desc: "E-Wallet Transfer",
        instapay_address_label: "InstaPay Address:",
        instapay_address_sub: "Transfer to the address above and paste the transaction reference code below.",
        vodafone_number_label: "Vodafone Cash Number:",
        vodafone_number_sub: "Send to this wallet number and enter the transaction sender number below.",
        service_location_label: "Service Location",
        select_location_default: "Select location...",
        share_location_label: "Share your location",
        share_location_hint: "Tap the button to send us your exact GPS position.",
        btn_share_location: "Share my location",
        btn_update_location: "Update location",
        other_area_label: "Write your area / address",
        other_area_placeholder: "e.g., Shubra, street name, building no.",
        target_ac_serial_label: "Target AC Unit Serial",
        customer_serial_label: "Customer Serial Number",
        customer_serial_hint: "Your registered serial number is shown as \"User ID\" in your dashboard.",
        tx_ref_label: "Transaction Reference / Sender Phone",
        address_label: "Or type your address",
        address_placeholder: "e.g., 12 El Nozha St, Cairo",
        address_hint: "If you'd rather not share your GPS location, type your full address here instead — either one is enough.",
        return_to_technician: "Return to technician",
        btn_submit_insurance: "Submit Insurance Payment",
        complete_order_title: "Complete Order",
        complete_repair_title: "Book Repair Inspection",
        repair_checkout_subtitle: "Select your location and the AC unit you would like checked by our technician.",
        unit_to_check_label: "Unit to be checked",
        unit_to_check_placeholder: "e.g., Carrier Inverter 2.25 HP (Living Room)",
        btn_confirm_repair: "Confirm Repair Booking",
        btn_test_email: "Test<br>Email",
        checkout_subtitle: "Choose a payment method and complete the request details below.",
        selected_item: "Selected Item",
        btn_confirm_order: "Confirm Order",
        master_controls: "Master Controls",
        admin_dashboard_title: "Cooling Art Admin Dashboard",
        admin_dashboard_desc: "Manage customer orders and technical repair requests",
        btn_create_staff: "Add Employee",
        total_revenue: "Total Revenue",
        registered_users: "Customers",
        active_insurance: "Active Insurance",
        active_repairs: "Active Repairs",
        registered_customers_title: "Registered Customers",
        search_users_placeholder: "Search by name, username, phone...",
        global_orders_title: "Global System Orders & Repair Requests",
        global_orders_subtitle: "Manage and filter customer purchases and repair bookings",
        filter_by_user: "Filter by User:",
        all_users: "All Users",
        task_board_title: "Task Board",
        task_board_subtitle: "Tasks distributed from the head admin to the admin team",
        th_user_id: "User ID",
        th_username: "Username",
        th_fullname: "Full Name",
        th_whatsapp: "WhatsApp",
        th_contact_phone: "Contact Phone",
        th_total_orders: "Total Orders",
        th_action: "Action",
        th_date: "Date",
        th_order_ref: "Order Ref",
        th_customer: "Customer",
        th_item_repair: "Item / Repair",
        th_location: "Location",
        th_gateway: "Gateway",
        th_amount: "Amount",
        th_state: "State",
        th_task_id: "Task ID",
        th_title: "Title",
        th_details: "Details",
        th_assigned_to: "Assigned To",
        th_priority: "Priority",
        th_due_date: "Due Date",
        th_status: "Status",
        th_customer_feedback: "Customer Feedback",
        user_id_label: "User ID",
        date_joined_label: "Date Joined",
        account_type_label: "Account Type",
        my_orders_title: "My Orders & Bookings",
        tech_workspace: "Technician Workspace",
        welcome_back: "Welcome back",
        whats_on_plate: "What's on your plate right now",
        task_log_title: "Task Log",
        task_log_subtitle: "A record of the tasks you've completed",
        active_right_now: "Active Right Now",
        open_tasks: "Open",
        in_progress_tasks: "In Progress",
        nothing_on_plate: "Nothing on your plate",
        nothing_on_plate_sub: "You have no open or in-progress tasks right now.",
        total_completed: "Total Completed",
        completed_this_week: "Completed This Week",
        completed_this_month: "Completed This Month",
        btn_decline: "Decline",
        btn_accept_task: "Accept Task",
        btn_mark_done: "Mark as Done",
        status_done: "Done",
        about_title: "About Cooling Art & Official Policies",
        about_desc: "Founded in Cairo, Egypt, Cooling Art is dedicated to delivering engineering excellence in HVAC climate solutions. From high-efficiency inverter air conditioners to 24-hour emergency technical repairs and affordable monthly unit insurance protection.",
        terms_title: "2-Year Extended AC Insurance — Full Terms & Conditions",
        terms_subtitle: "As certified by Cooling Art, an authorized service center and distributor for Al-Araby air conditioning units",
        terms_intro: "Once a unit's original Al-Araby manufacturer warranty (1–2 years) expires, we offer a continued protection plan for ",
        terms_fee: "EGP 100 per month, for up to two additional years",
        term_1: "The plan covers every part of the AC unit except the remote control and the external pipe/tubing connections.",
        term_2: "Only units whose original Al-Araby warranty has already ended (after one or two years) are eligible — no exceptions.",
        term_3: "Includes one free maintenance visit at the start of every season. For any fault outside of that, simply call in a service report.",
        term_4: "Repairs, spare parts, Freon gas recharges, technician transport, and unit pickup are all provided free of charge for the full two-year period.",
        please_note: "Please Note",
        void_warning: "The insurance plan is considered void in the following cases:",
        void_1: "Non-payment of the agreed EGP 100 monthly fee for two consecutive months.",
        void_2: "Any scratching, erasing, or altering of the warranty start date on the card.",
        void_3: "Relocating the unit from the address where it was originally inspected without the company's knowledge — moves are only permitted through Cooling Art, at a fee agreed in advance between the company and the customer.",
        not_covered_title: "Work not covered by the insurance:",
        not_covered_1: "Any fault caused by tampering with the unit — whether by another technician or by the customer themselves.",
        not_covered_2: "Any fault caused by rodents (rats/mice).",
        not_covered_3: "Any fault resulting from breakage or fire.",
        not_covered_4: "The remote control and the external pipe connections/cabling between the indoor and outdoor units.",
        auth_center_note: "Cooling Art is an Al-Araby authorized service center with a registered account number on file. For maintenance reports, use the ",
        or_call_report: "page or call in your report by phone.",
        who_we_are_title: "Who We Are",
        who_we_are_subtitle: "Every registered account in our organization — by name and job",
        technicians_header: "Technical Team",
        hr_header: "Customer Service Team",
        contact_title: "Contact Cooling Art",
        contact_subtitle: "Get in touch with our emergency team or order hotline",
        email_us: "Email Us",
        call_hotline: "Call Hotline",
        whatsapp_live: "WhatsApp Live",
        instant_chat: "Instant Chat",
        account_access: "Account Access",
        tab_login: "Login",
        tab_signup: "Sign-Up",
        label_fullname: "Full Name",
        label_whatsapp: "WhatsApp Number",
        label_contact_number: "Contact Number",
        label_username: "Username",
        label_password: "Password",
        btn_login: "Login to Cooling Art",
        btn_register: "Register New Account",
        btn_cancel: "Cancel",
        btn_reset: "Reset",
        btn_delete: "Delete",
        btn_logout: "Logout",
        logout_confirm_msg: "Are you sure you want to log out of your Cooling Art account?",
        btn_login_signup: "Login / Sign Up",
        leave_feedback: "Leave Feedback",
        feedback_satisfied: "Satisfied",
        feedback_issue: "Issue Reported",
        needs_technician: "Needs Technician",
        company_name: "Cooling Art Air Conditioning Co.",
        footer_rights: "© 2026 Cooling Art Platform. All rights reserved. Specialized HVAC & Insurance Services.",
        forgot_password: "Forgot Password?",
        fp_title: "Reset Password",
        fp_desc: "Sign in with your registered phone number to reset your password.",
        fp_phone: "Registered Phone Number",
        fp_new_password: "New Password",
        fp_send: "Verify & Continue",
        fp_reset: "Set New Password",
        fp_not_found: "No account matches that username and phone number.",
        fp_success: "Password updated! You are now signed in.",
        fp_invalid_pw: "Password must be at least 6 characters (letters, numbers, underscore only).",
        edit: "Edit",
        out_of_stock: "Out of Stock",
        in_stock: "In Stock",
        edit_product: "Edit Product",
        edit_service: "Edit Service",
        edit_order: "Edit Order",
        item_details: "Item / Repair details",
        price_egp: "Price (EGP)",
        status_label: "Status",
        save_changes: "Save Changes",
        stock_label: "Mark as Out of Stock",
        image_url_label: "Image URL",
        negative_ratings: "Negative Ratings",
        total_tasks: "Total Tasks",
        removed_badge: "Removed",
        repair_insurance_cta_t: "Protect Your Repaired Unit",
        repair_insurance_cta_d: "Cover breakdowns, electrical failures and Freon leaks for only 100 EGP / month.",
        btn_view_insurance: "View Insurance Plan"
    },
    ar: {
        nav_home: "الرئيسية",
        nav_dashboard: "لوحة التحكم",
        nav_dashboard_text: "لوحة التحكم",
        nav_products: "المنتجات",
        nav_tech_fix: "الصيانة",
        nav_insurance: "التأمين",
        nav_about: "السياسات",
        nav_reviews: "التقييمات",
        reviews_title: "التقييمات والفيديوهات",
        reviews_desc: "ماذا يقول عملاؤنا عنا، ونظرة على طريقة عملنا.",
        nav_who_are_we: "فريق العمل",
        nav_contact: "تواصل معنا",
        lang_toggle_label: "English",
        role_head_admin: "المدير العام",
        role_executive: "المدير التنفيذي",
        role_admin: "مدير",
        role_hr: "خدمة العملاء",
        role_technician: "فني صيانة",
        role_customer: "عميل",
        head_badge: "الرئيسي",
        hero_tagline: "متخصصو التحكم في المناخ رقم 1 في مصر",
        hero_title_1: "إتقان فن ",
        hero_title_2: "التبريد النقي.",
        home_svc_products_t: "وحدات تكييف مميزة",
        home_svc_products_d: "وحدات سبليت وسنترال ومحمولة عالية الكفاءة من أفضل الماركات.",
        home_svc_repairs_t: "صيانة فنية سريعة",
        home_svc_repairs_d: "مهندسون معتمدون للإصلاح وشحن الفريون والتنظيف العميق وإعادة التركيب.",
        home_svc_insurance_t: "تأمين الحماية",
        home_svc_insurance_d: "مدّ تغطية جهازك مقابل 100 جنيه شهرياً لمدة تصل إلى سنتين.",
        home_link_explore: "استكشف",
        home_trust_1: "مركز صيانة معتمد من العربي",
        home_trust_2: "إصلاح طوارئ على مدار 24 ساعة",
        home_trust_3: "ادفع عبر إنستا باي أو فودافون كاش",
        home_trust_4: "صيانة موسمية مجانية مع التأمين",
        hero_desc: "اشترِ أجهزة التكييف عالية الكفاءة، واطلب صيانة فنية فورية، واحمِ أجهزتك من خلال خطة التأمين الشهري عبر انستا باي أو فودافون كاش.",
        btn_explore_ac: "تصفح أجهزة التكييف",
        btn_book_fix: "حجز صيانة فنية",
        btn_insurance_plan: "خطة التأمين",
        products_title: "أجهزة تكييف الهواء",
        products_subtitle: "وحدات تبريد عالية الأداء للمنازل والشركات",
        search_products_placeholder: "ابحث عن موديلات التكييف...",
        btn_order_unit: "طلب الجهاز",
        price_label: "السعر",
        egp_symbol: "ج.م",
        tech_fix_title: "خدمات الدعم الفني والصيانة",
        tech_fix_subtitle: "صيانة احترافية، إعادة شحن الفريون، وإصلاحات طارئة بواسطة مهندسي كولينج آرت المعتمدين",
        btn_book_repair: "حجز صيانة",
        insurance_title: "تأمين حماية كولينج آرت",
        insurance_subtitle: "احمِ أجهزة التكييف الخاصة بك ضد الأعطال المفاجئة والمشاكل الكهربائية وتسريبات الفريون. ادفع اشتراك التأمين الشهري فوراً عبر انستا باي أو فودافون كاش.",
        pay_insurance_title: "سداد الاشتراك الشهري للتأمين",
        select_gateway: "اختر وسيلة الدفع",
        instapay_desc: "تحويل بنكي فوري",
        vodafone_desc: "تحويل محفظة إلكترونية",
        instapay_address_label: "عنوان انستا باي:",
        instapay_address_sub: "قم بالتحويل إلى العنوان أعلاه وأدخل رقم عملية التحويل بالأسفل.",
        vodafone_number_label: "رقم فودافون كاش:",
        vodafone_number_sub: "قم بالتحويل إلى رقم المحفظة هذا وأدخل رقم الهاتف المرسل منه بالأسفل.",
        service_location_label: "منطقة الخدمة",
        select_location_default: "اختر المنطقة...",
        share_location_label: "شارك موقعك",
        share_location_hint: "اضغط على الزر لإرسال موقعك الدقيق (GPS) إلينا.",
        btn_share_location: "مشاركة موقعي",
        btn_update_location: "تحديث الموقع",
        other_area_label: "اكتب منطقتك / عنوانك",
        other_area_placeholder: "مثال: شبرا، اسم الشارع، رقم العقار",
        target_ac_serial_label: "الرقم التسلسلي للجهاز",
        customer_serial_label: "الرقم التسلسلي للعميل",
        customer_serial_hint: "رقمك التسلسلي المسجل يظهر في لوحة حسابك باسم \"معرف المستخدم\".",
        tx_ref_label: "رقم عملية التحويل / رقم هاتف الراسل",
        address_label: "أو اكتب عنوانك",
        address_placeholder: "مثال: 12 شارع النزهة، القاهرة",
        address_hint: "إذا كنت تفضّل عدم مشاركة موقعك عبر GPS، اكتب عنوانك الكامل هنا — أيهما يكفي.",
        return_to_technician: "إعادة إلى الفني",
        btn_submit_insurance: "تأكيد سداد التأمين",
        complete_order_title: "إتمام طلب شراء",
        complete_repair_title: "حجز فحص وصيانة",
        repair_checkout_subtitle: "حدد موقع الخدمة وجهاز التكييف المطلوب فحصه بواسطة الفني.",
        unit_to_check_label: "الوحدة المراد فحصها",
        unit_to_check_placeholder: "مثال: كاريير انفرتر 2.25 حصان (غرفة المعيشة)",
        btn_confirm_repair: "تأكيد حجز الصيانة",
        btn_test_email: "اختبار<br>البريد",
        checkout_subtitle: "اختر طريقة الدفع وأكمل تفاصيل الطلب أدناه.",
        selected_item: "المنتج / الخدمة المحددة",
        btn_confirm_order: "تأكيد الطلب",
        master_controls: "التحكم الرئيسي",
        admin_dashboard_title: "لوحة تحكم إدارة كولينج آرت",
        admin_dashboard_desc: "إدارة طلبات العملاء وطلبات الصيانة الفنية",
        btn_create_staff: "إضافة موظف",
        total_revenue: "إجمالي الإيرادات",
        registered_users: "العملاء",
        active_insurance: "التأمينات النشطة",
        active_repairs: "الصيانة النشطة",
        registered_customers_title: "العملاء المسجلون",
        search_users_placeholder: "البحث بالاسم، اسم المستخدم، الهاتف...",
        global_orders_title: "جميع الطلبات وبلاغات الصيانة",
        global_orders_subtitle: "إدارة وتصفية مشتريات العملاء وحجوزات الصيانة",
        filter_by_user: "تصفية حسب العميل:",
        all_users: "جميع العملاء",
        task_board_title: "جدول المهام",
        task_board_subtitle: "المهام الموزعة من المدير العام إلى فريق العمل",
        th_user_id: "معرف المستخدم",
        th_username: "اسم المستخدم",
        th_fullname: "الاسم بالكامل",
        th_whatsapp: "واتساب",
        th_contact_phone: "رقم التواصل",
        th_total_orders: "إجمالي الطلبات",
        th_action: "إجراء",
        th_date: "التاريخ",
        th_order_ref: "رقم الطلب",
        th_customer: "العميل",
        th_item_repair: "المنتج / الخدمة",
        th_location: "المنطقة",
        th_gateway: "وسيلة الدفع",
        th_amount: "المبلغ",
        th_state: "الحالة",
        th_task_id: "رقم المهمة",
        th_title: "العنوان",
        th_details: "التفاصيل",
        th_assigned_to: "المسند إليه",
        th_priority: "الأولوية",
        th_due_date: "تاريخ الاستحقاق",
        th_status: "الحالة",
        th_customer_feedback: "تقييم العميل",
        user_id_label: "معرف المستخدم",
        date_joined_label: "تاريخ الانضمام",
        account_type_label: "نوع الحساب",
        my_orders_title: "طلباتي وحجوزاتي",
        tech_workspace: "مساحة عمل الفني",
        welcome_back: "مرحباً بك",
        whats_on_plate: "المهام المطلوبة منك الآن",
        task_log_title: "سجل المهام",
        task_log_subtitle: "سجل المهام التي قمت بإنجازها",
        active_right_now: "المهام النشطة الآن",
        open_tasks: "مفتوحة",
        in_progress_tasks: "قيد التنفيذ",
        nothing_on_plate: "لا توجد مهام حالياً",
        nothing_on_plate_sub: "ليس لديك أي مهام مفتوحة أو قيد التنفيذ في الوقت الحالي.",
        total_completed: "إجمالي المنجز",
        completed_this_week: "المنجز هذا الأسبوع",
        completed_this_month: "المنجز هذا الشهر",
        btn_decline: "رفض المهمة",
        btn_accept_task: "قبول المهمة",
        btn_mark_done: "تحديد كمنجز",
        status_done: "منجز",
        about_title: "عن كولينج آرت والسياسات الرسمية",
        about_desc: "تأسست شركة كولينج آرت في القاهرة - مصر، وتهدف إلى تقديم التميز الهندسي في حلول تكييف الهواء. بدءاً من أجهزة التكييف الإنفيرتر عالية الكفاءة إلى خدمات الصيانة الفنية الطارئة على مدار 24 ساعة وتغطية التأمين الشهري بأسعار مناسبة.",
        terms_title: "تأمين التكييف الممتد لمدة عامين — الشروط والأحكام الكاملة",
        terms_subtitle: "معتمد من كولينج آرت، مركز صيانة وموزع معتمد لأجهزة تكييف العربي",
        terms_intro: "بمجرد انتهاء فترة ضمان المصنع الأصلية من العربي (1–2 سنة)، نقدم برنامج حماية مستمر مقابل ",
        terms_fee: "100 جنيه شهرياً، ولمدة تصل إلى سنتين إضافيتين",
        term_1: "يغطي البرنامج جميع أجزاء جهاز التكييف باستثناء وحدة التحكم عن بعد (الريموت) والوصلات/الأنابيب الخارجية.",
        term_2: "ينطبق فقط على الأجهزة التي انتهت فترة ضمانها الأصلي من العربي — دون استثناءات.",
        term_3: "يتضمن زيارة صيانة مجانية واحدة في بداية كل موسم. ولأي أعطال أخرى، يكفي فقط إرسال بلاغ صيانة.",
        term_4: "الإصلاحات، قطع الغيار، إعادة شحن الفريون، انتقال الفني، ونقل الجهاز تُقدم جميعها مجاناً بالكامل طوال فترة العامين.",
        please_note: "تنبيه هام",
        void_warning: "يُعد اشتراك التأمين ملغياً وغير سارٍ في الحالات التالية:",
        void_1: "عدم سداد الاشتراك الشهري المتفق عليه (100 جنيه) لمدة شهرين متتاليين.",
        void_2: "أي كشط أو مسح أو تعديل في تاريخ بدء الضمان المدون على البطاقة.",
        void_3: "نقل الجهاز من العنوان الذي تم فحصه فيه أول مرة دون علم الشركة — النقل مسموح فقط عن طريق كولينج آرت مقابل رسوم متفق عليها مسبقاً.",
        not_covered_title: "الأعمال غير المشمولة بالتأمين:",
        not_covered_1: "أي عطل ناتج عن العبث بالجهاز — سواء من قِبل فني آخر أو من قِبل العميل نفسه.",
        not_covered_2: "أي عطل ناتج عن القوارض (الفئران).",
        not_covered_3: "أي عطل ناتج عن الكسر أو الحريق.",
        not_covered_4: "وحدة التحكم عن بعد (الريموت) والتوصيلات والكابلات الخارجية بين الوحدتين الداخلية والخارجية.",
        auth_center_note: "كولينج آرت مركز صيانة معتمد من العربي برقم حساب مسجل. لبلاغات الصيانة استخدم صفحة ",
        or_call_report: "أو اتصل بنا لإرسال البلاغ عبر الهاتف.",
        who_we_are_title: "من نحن",
        who_we_are_subtitle: "جميع الحسابات المسجلة في مؤسستنا — بالاسم والوظيفة",
        technicians_header: "الفريق الفني",
        hr_header: "فريق خدمة العملاء",
        contact_title: "تواصل مع كولينج آرت",
        contact_subtitle: "تواصل مع فريق الطوارئ أو الخط الساخن للطلبات",
        email_us: "راسلنا عبر البريد",
        call_hotline: "اتصل بالخط الساخن",
        whatsapp_live: "واتساب مباشر",
        instant_chat: "محادثة فورية",
        account_access: "الدخول للحساب",
        tab_login: "تسجيل الدخول",
        tab_signup: "إنشاء حساب",
        label_fullname: "الاسم بالكامل",
        label_whatsapp: "رقم الواتساب",
        label_contact_number: "رقم التواصل",
        label_username: "اسم المستخدم",
        label_password: "كلمة السر",
        btn_login: "تسجيل الدخول",
        btn_register: "تسجيل حساب جديد",
        btn_cancel: "إلغاء",
        btn_reset: "إعادة ضبط",
        btn_delete: "حذف",
        btn_logout: "تسجيل الخروج",
        logout_confirm_msg: "هل أنت تأكد من أنك تريد تسجيل الخروج من حساب كولينج آرت؟",
        btn_login_signup: "تسجيل الدخول / إنشاء حساب",
        leave_feedback: "إضافة تقييم",
        feedback_satisfied: "راضٍ عن الخدمة",
        feedback_issue: "يوجد ملاحظة",
        needs_technician: "بانتظار فني",
        company_name: "شركة كولينج آرت للتكييف",
        footer_rights: "© 2026 منصة كولينج آرت. جميع الحقوق محفوظة. خدمات التكييف والتأمين المتخصصة.",
        forgot_password: "نسيت كلمة السر؟",
        fp_title: "إعادة تعيين كلمة السر",
        fp_desc: "سجّل الدخول برقم هاتفك المسجل لإعادة تعيين كلمة السر.",
        fp_phone: "رقم الهاتف المسجل",
        fp_new_password: "كلمة السر الجديدة",
        fp_send: "تحقق واستمر",
        fp_reset: "تعيين كلمة السر الجديدة",
        fp_not_found: "لا يوجد حساب يطابق اسم المستخدم ورقم الهاتف.",
        fp_success: "تم تحديث كلمة السر! تم تسجيل دخولك.",
        fp_invalid_pw: "كلمة السر يجب ألا تقل عن 6 أحرف (حروف وأرقام وشرطة سفلية فقط).",
        edit: "تعديل",
        out_of_stock: "نفدت الكمية",
        in_stock: "متوفر",
        edit_product: "تعديل المنتج",
        edit_service: "تعديل الخدمة",
        edit_order: "تعديل الطلب",
        item_details: "تفاصيل المنتج / الصيانة",
        price_egp: "السعر (جنيه)",
        status_label: "الحالة",
        save_changes: "حفظ التعديلات",
        stock_label: "تحديد كـ (نفدت الكمية)",
        image_url_label: "رابط الصورة",
        negative_ratings: "تقييمات سلبية",
        total_tasks: "إجمالي المهام",
        removed_badge: "محذوف",
        repair_insurance_cta_t: "أمّن الوحدة التي تم إصلاحها",
        repair_insurance_cta_d: "غطِّ الأعطال والمشاكل الكهربائية وتسريبات الفريون مقابل 100 جنيه فقط شهرياً.",
        btn_view_insurance: "عرض خطة التأمين"
    }
};

const LOCATION_AR = {
    'Faisal': 'فيصل',
    'Haram': 'الهرم',
    '6th of October': '6 أكتوبر',
    'Sheikh Zayed': 'الشيخ زايد',
    'Dokki': 'الدقي',
    'Mohandessin': 'المهندسين',
    'Maadi': 'المعادي',
    'Nasr City': 'مدينة نصر',
    'Heliopolis': 'مصر الجديدة',
    'New Cairo': 'القاهرة الجديدة',
    'Downtown Cairo': 'وسط البلد',
    'Mokattam': 'المقطم',
    'Alexandria': 'الإسكندرية',
    'Other Area': 'منطقة أخرى',
    'Return to technician': 'إعادة إلى الفني',
    'Tap to play': 'اضغط للتشغيل',
    'Created': 'أُنشئت'
};

const PRODUCT_TRANSLATIONS = {
    'p1': { name: 'تكييف كاريير إنفيرتر 2.25 حصان سبليت', category: 'تكييف سبليت', specs: 'تبريد سريع، موفر للطاقة، غاز صديق للبيئة R410A' },
    'p2': { name: 'تكييف شارب 1.5 حصان بارد ساخن إنفيرتر', category: 'تكييف سبليت', specs: 'تكنولوجيا بلازما كلاستر، شاشة ديجيتال' },
    'p3': { name: 'وحدة تكييف مركزية إل جي 5 حصان VRF', category: 'تكييف مركزي', specs: 'توزيع هواء لعدة غرف، أداء شاق' },
    'p4': { name: 'تكييف فريش سمارت متنقل 1.75 حصان', category: 'تكييف متنقل', specs: 'سهل الحركة بعجلات، ريموت كنترول' }
};

const SERVICE_TRANSLATIONS = {
    's1': { name: 'صيانة طارئة للأعطال الفنية', desc: 'زيارة فحص وتشخيص وإصلاح الأعطال الكهربائية للأجهزة المتوقفة أو غير المبردة.' },
    's2': { name: 'إعادة شحن فريون بالكامل (R410A / R22)', desc: 'فحص كامل للضغط، كشف التسريبات، وإعادة شحن الفريون بالكامل.' },
    's3': { name: 'غسيل كيميائي عميق للمبخر والملفات', desc: 'غسيل بمضخة ضغط عالي، معالجة الفلاتر بمضاد البكتيريا، وتسليك الصرف.' },
    's4': { name: 'فك وتثبيت تكييف بالكامل', desc: 'نقل احترافي يشمل عزل المواسير النحاسية واختبار التشغيل.' },
    's5': { name: 'تأمين حماية كولينج آرت', desc: 'خطة حماية شهرية تغطي الأعطال والمشاكل الكهربائية وتسريبات الفريون — 100 جنيه شهرياً لمدة تصل إلى سنتين. ادفع عبر انستا باي أو فودافون كاش.' }
};

function getLocationLabel(location) {
    if (state.currentLang === 'ar') {
        const area = (state.areas || []).find(a => a.name === location);
        if (area && area.nameAr) return area.nameAr;
        if (LOCATION_AR[location]) return LOCATION_AR[location];
    }
    return location;
}

function t(key, fallback = '') {
    const lang = state.currentLang || 'en';
    if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
        return TRANSLATIONS[lang][key];
    }
    if (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) {
        return TRANSLATIONS['en'][key];
    }
    return fallback || key;
}

function toggleLanguage() {
    state.currentLang = state.currentLang === 'en' ? 'ar' : 'en';
    localStorage.setItem('ca_lang', state.currentLang);
    window.location.reload();
}

function applyLanguage() {
    const lang = state.currentLang || 'en';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    const toggleLabel = document.getElementById('langToggleLabel');
    if (toggleLabel) {
        toggleLabel.textContent = t('lang_toggle_label', 'عربي');
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (text) {
            el.textContent = text;
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const text = t(key);
        if (text) {
            el.setAttribute('placeholder', text);
        }
    });

    // Anything without a translation key (table rows, toasts, statuses...) is handled here.
    if (lang === 'ar') startArabicLayer();
}


// ================= FULL ARABIC LAYER =================
// Translates every remaining English string on screen (static HTML, table rows, toasts,
// statuses) when the site is in Arabic. It runs once on load and then watches the page,
// so anything rendered later is translated as well. English mode is untouched.
const AR_UI = {
    // ----- page / layout -----
    'Cooling Art - Premium AC Sales, Technical Fix & Insurance': 'كولينج آرت - بيع التكييفات المتميزة والصيانة الفنية والتأمين',
    'Toggle Theme': 'تبديل المظهر',
    'Service Areas': 'مناطق الخدمة',
    'Areas customers can choose when booking a repair, ordering a unit, or paying insurance. Add one below and it shows up instantly.': 'المناطق التي يمكن للعملاء اختيارها عند حجز صيانة أو طلب وحدة أو سداد التأمين. أضف منطقة بالأسفل وستظهر فوراً.',
    'Add Area': 'إضافة منطقة',
    'New area name, e.g., Shubra': 'اسم المنطقة الجديدة، مثال: شبرا',
    'InstaPay': 'إنستاباي',
    'Vodafone Cash': 'فودافون كاش',
    'Card': 'بطاقة',
    'On-Site Diagnostic': 'تشخيص في الموقع',
    'Pending Payment': 'في انتظار الدفع',
    'Tap the button to send us your exact GPS position.': 'اضغط الزر لإرسال موقعك الدقيق عبر GPS.',
    'Share my location': 'مشاركة موقعي',
    'e.g., Carrier 2.25HP Serial #8821-X9': 'مثال: كاريير 2.25 حصان، سيريال #8821-X9',
    'e.g., INSTA-99214 or 01012345678': 'مثال: INSTA-99214 أو 01012345678',
    'e.g., Carrier Inverter 2.25 HP (Living Room)': 'مثال: كاريير إنفيرتر 2.25 حصان (غرفة المعيشة)',
    'Master Controls': 'التحكم الرئيسي',
    'Cooling Art Admin Dashboard': 'لوحة تحكم كولينج آرت',
    'Manage customer orders and technical repair requests': 'إدارة طلبات العملاء وطلبات الصيانة الفنية',
    'Create Staff Account': 'إنشاء حساب موظف',
    'Create Customer Services and Technician accounts (head admin only)': 'إنشاء حسابات خدمة العملاء والفنيين (للمسؤول الرئيسي فقط)',
    'Team Accounts': 'حسابات الفريق',
    'All Customer Services and Technician accounts created by the head admin': 'جميع حسابات خدمة العملاء والفنيين التي أنشأها المسؤول الرئيسي',
    'User ID': 'رقم المستخدم', 'Username': 'اسم المستخدم', 'Full Name': 'الاسم الكامل', 'Role': 'الدور',
    'WhatsApp': 'واتساب', 'Contact Phone': 'هاتف التواصل', 'Action': 'إجراء', 'Password': 'كلمة المرور',
    'Welcome back': 'مرحباً بعودتك', 'Task Log': 'سجل المهام',
    'Date Joined': 'تاريخ الانضمام', 'WhatsApp Number': 'رقم واتساب', 'Account Type': 'نوع الحساب',
    'Total Orders': 'إجمالي الطلبات', 'My Orders & Bookings': 'طلباتي وحجوزاتي', 'Date': 'التاريخ',
    'Order Ref': 'رقم الطلب', 'Item / Repair': 'المنتج / الصيانة', 'Amount': 'المبلغ', 'Status': 'الحالة', 'Feedback': 'التقييم',
    'WhatsApp number already taken': 'رقم واتساب مستخدم بالفعل',
    'Contact number already taken': 'رقم التواصل مستخدم بالفعل',
    'Username already taken': 'اسم المستخدم مستخدم بالفعل',
    'Confirm User Deletion': 'تأكيد حذف المستخدم',
    'Are you sure you want to delete this user?': 'هل أنت متأكد أنك تريد حذف هذا المستخدم؟',
    'Reset Total Revenue': 'إعادة ضبط إجمالي الإيرادات',
    'This will restart the revenue counter from zero. No orders will be deleted.': 'سيتم بدء عداد الإيرادات من الصفر. لن يتم حذف أي طلبات.',
    'Let us know if the job was completed to your satisfaction.': 'أخبرنا إن كان العمل قد تم بما يرضيك.',
    'Rating (0 – 5 stars)': 'التقييم (من 0 إلى 5 نجوم)',
    'Please choose a rating from 0 to 5.': 'يرجى اختيار تقييم من 0 إلى 5.',
    'Done — Satisfied with the service': 'تم — راضٍ عن الخدمة',
    'Done — But an issue remains': 'تم — لكن ما زالت هناك مشكلة',
    'Anything you\'d like to add...': 'أي شيء تود إضافته...',
    'Submit Feedback': 'إرسال التقييم',
    'e.g. Mahmoud Ali': 'مثال: محمود علي', 'e.g. 01012345678': 'مثال: 01012345678', 'e.g. 01098765432': 'مثال: 01098765432',
    'e.g., Mona Adel': 'مثال: منى عادل', 'e.g., mona.cs': 'مثال: mona.cs', 'Set a password': 'اختر كلمة مرور', 'e.g., 01098765432': 'مثال: 01098765432',
    'Enter username...': 'أدخل اسم المستخدم...', 'Enter password...': 'أدخل كلمة المرور...',
    'Logout': 'تسجيل الخروج', 'Delete User': 'حذف المستخدم', 'Replace Part': 'استبدال قطعة', 'Withdraw – Get It': 'سحب الوحدة – استلامها', 'Withdraw – Get Back': 'سحب الوحدة – إرجاعها للعميل', 'Repair (In Place)': 'صيانة في الموقع', 'Need to Withdraw': 'بحاجة للسحب', 'Withdraw Done': 'تم السحب', 'Fix in Workshop': 'إصلاح في الورشة', 'Need to Get It Back': 'بحاجة لاستلامها', 'Remove area': 'حذف المنطقة', 'Delete Staff Account': 'حذف حساب الموظف',
    // ----- dashboards -----
    'Needs Technician': 'بحاجة لفني', 'Needs Assignment': 'بحاجة إلى تعيين', '-- Assign Technician --': '-- تعيين فني --',
    'No accounts registered yet.': 'لا توجد حسابات مسجلة بعد.',
    'No orders placed yet.': 'لم يتم تقديم أي طلبات بعد.',
    'No customers match your search.': 'لا يوجد عملاء مطابقون لبحثك.',
    'No orders found for the selected user.': 'لا توجد طلبات للمستخدم المحدد.',
    'No staff accounts created yet.': 'لم يتم إنشاء حسابات موظفين بعد.',
    'No active tasks.': 'لا توجد مهام نشطة.',
    'No tasks in this category.': 'لا توجد مهام في هذه الفئة.',
    'No areas yet — customers cannot book repairs until you add at least one.': 'لا توجد مناطق بعد — لا يمكن للعملاء حجز صيانة حتى تضيف منطقة واحدة على الأقل.',
    'Awaiting Completion': 'بانتظار الإنجاز', 'Awaiting Customer': 'بانتظار العميل', 'Job Not Done Yet': 'العمل لم يكتمل بعد',
    'Issue Reported': 'تم الإبلاغ عن مشكلة', 'Satisfied': 'راضٍ', 'Leave Feedback': 'اترك تقييماً',
    'Total Revenue': 'إجمالي الإيرادات', 'Reset': 'إعادة ضبط',
    'Revenue is currently counted from the last reset.': 'يتم احتساب الإيرادات حالياً منذ آخر إعادة ضبط.',
    'Registered Users': 'المستخدمون المسجلون', 'Active Insurance': 'التأمين النشط', 'Active Repairs': 'الصيانات النشطة',
    'Only the head admin can create Customer Services and Technician accounts. These roles never go through the public signup form.': 'المسؤول الرئيسي فقط يمكنه إنشاء حسابات خدمة العملاء والفنيين. هذه الأدوار لا تُنشأ عبر نموذج التسجيل العام.',
    'Customer Services': 'خدمة العملاء', 'Technician': 'فني صيانة', 'All Users': 'كل المستخدمين', 'N/A': 'غير متاح',
    'Active Right Now': 'نشطة الآن', 'Nothing on your plate': 'لا توجد مهام لديك',
    'You have no open or in-progress tasks right now.': 'ليس لديك مهام مفتوحة أو قيد التنفيذ حالياً.',
    'Total Completed': 'إجمالي المكتمل', 'Completed This Week': 'المكتمل هذا الأسبوع', 'Completed This Month': 'المكتمل هذا الشهر',
    'No completed tasks yet': 'لا توجد مهام مكتملة بعد',
    'Tasks you mark "Done" from Home will show up here as a record of your work.': 'المهام التي تحددها "منجزة" من الرئيسية ستظهر هنا كسجل لعملك.',
    'No due date': 'بدون موعد', 'Decline': 'رفض', 'Accept Task': 'قبول المهمة', 'Mark as Done': 'تحديد كمنجز',
    'Repair Request': 'طلب صيانة', 'New Unit Order': 'طلب وحدة جديدة', 'Close': 'إغلاق',
    // ----- statuses / priorities -----
    'Open': 'مفتوح', 'In Progress': 'قيد التنفيذ', 'Done': 'منجز', 'Completed': 'مكتمل', 'Delivered': 'تم التسليم',
    'On The Way': 'في الطريق', 'Inspection Requested': 'تم طلب المعاينة', 'Pending Dispatch': 'قيد الإرسال',
    'Active / Verified': 'نشط / موثق', 'High': 'عالية', 'Normal': 'عادية', 'Urgent': 'عاجلة',
    // ----- orders / items -----
    'Protection Insurance': 'تأمين الحماية', 'Monthly Protection Insurance': 'تأمين الحماية الشهري',
    'Monthly Unit Protection Insurance': 'تأمين حماية الوحدة الشهري', 'Test AC Unit Diagnostic Visit': 'زيارة تشخيص تجريبية للتكييف',
    '100 EGP / Month': '100 جنيه / شهرياً', 'Other Area': 'منطقة أخرى'
};
Object.assign(AR_UI, {
    'Customers': 'العملاء',
    'Out of Stock': 'نفدت الكمية',
    'In Stock': 'متوفر',
    'Edit': 'تعديل',
    'Save Changes': 'حفظ التعديلات',
    'Total Tasks': 'إجمالي المهام',
    'Negative Ratings': 'تقييمات سلبية',
    'Removed': 'محذوف',
    'No ratings yet': 'لا توجد تقييمات بعد',
    'Price (EGP)': 'السعر (جنيه)',
    'Edit Product': 'تعديل المنتج',
    'Edit Service': 'تعديل الخدمة',
    'Edit Order': 'تعديل الطلب',
    'This item is currently Out of Stock.': 'هذا المنتج نفدت كميته حالياً.',
    'Product updated.': 'تم تحديث المنتج.',
    'Service updated.': 'تم تحديث الخدمة.',
    'Order updated.': 'تم تحديث الطلب.',
    'Only the head admin can edit orders.': 'المسؤول الرئيسي فقط يمكنه تعديل الطلبات.',
    'Rating hidden from the public page — kept in admin records.': 'تم إخفاء التقييم من الصفحة العامة — وبقي محفوظاً في سجلات الإدارة.',
    'Please enter valid item details and price.': 'يرجى إدخال تفاصيل وسعر صحيحين.',
    'Not Assigned': 'غير معيّن',
    'Assigned but Not Accepted': 'معيّنة – لم تُقبل بعد',
    'Replace in Customer Home': 'استبدال قطعة (منزل العميل)',
    'Withdraw Get It': 'سحب – استلام',
    'In Progress in Workshop': 'قيد التنفيذ – في الموقع',
    'Get Back': 'إرجاع الوحدة',
    'Unit Orders': 'طلبات الوحدات',
    'Or type your address': 'أو اكتب عنوانك',
    'Joined': 'انضم',
    'Photo': 'الصورة',
    // ----- toasts -----
    'Access restricted to administrators only.': 'الدخول مقصور على المسؤولين فقط.',
    'Access restricted to technicians only.': 'الدخول مقصور على الفنيين فقط.',
    'Please login to view your dashboard.': 'يرجى تسجيل الدخول لعرض لوحتك.',
    'Invalid username or password!': 'اسم المستخدم أو كلمة المرور غير صحيحة!',
    'Logged out safely.': 'تم تسجيل الخروج بأمان.',
    'The head admin account cannot be deleted.': 'لا يمكن حذف حساب المسؤول الرئيسي.',
    'Only the head admin can delete users and orders.': 'المسؤول الرئيسي فقط يمكنه حذف المستخدمين والطلبات.',
    'Order successfully deleted!': 'تم حذف الطلب بنجاح!',
    'User successfully deleted!': 'تم حذف المستخدم بنجاح!',
    'Thanks for your feedback!': 'شكراً على تقييمك!',
    'Only the head admin or an admin can manage service areas.': 'المسؤول الرئيسي أو المسؤول فقط يمكنه إدارة مناطق الخدمة.',
    'Please type the area name.': 'يرجى كتابة اسم المنطقة.',
    'Only the head admin can create staff accounts.': 'المسؤول الرئيسي فقط يمكنه إنشاء حسابات الموظفين.',
    'Please select a valid staff role.': 'يرجى اختيار دور وظيفي صحيح.',
    'Please complete the staff account form.': 'يرجى إكمال نموذج حساب الموظف.',
    'WhatsApp number must be exactly 11 digits.': 'يجب أن يتكون رقم واتساب من 11 رقماً بالضبط.',
    'Contact number must be exactly 11 digits.': 'يجب أن يتكون رقم التواصل من 11 رقماً بالضبط.',
    'That username is already taken.': 'اسم المستخدم هذا مستخدم بالفعل.',
    'Only the head admin or Customer Services can reassign tasks.': 'المسؤول الرئيسي أو خدمة العملاء فقط يمكنهم إعادة تعيين المهام.',
    'This task is already Done — the assigned technician can no longer be changed.': 'هذه المهمة منجزة بالفعل — لا يمكن تغيير الفني المعيّن.',
    'Please choose a valid technician to reassign to.': 'يرجى اختيار فني صحيح لإعادة التعيين.',
    'You can only update your own assigned tasks.': 'يمكنك تحديث المهام المعيّنة لك فقط.',
    'You can only decline your own assigned tasks.': 'يمكنك رفض المهام المعيّنة لك فقط.',
    'Only a task you have not yet accepted can be declined.': 'يمكن رفض المهمة التي لم تقبلها بعد فقط.',
    'Thank you! Your message has been routed to Cooling Art support.': 'شكراً لك! تم توجيه رسالتك إلى دعم كولينج آرت.',
    'Only the head admin can delete orders.': 'المسؤول الرئيسي فقط يمكنه حذف الطلبات.',
    'Only the head admin can reset revenue.': 'المسؤول الرئيسي فقط يمكنه إعادة ضبط الإيرادات.',
    'Total revenue has been reset.': 'تمت إعادة ضبط إجمالي الإيرادات.'
});
Object.assign(AR_UI, {
    'Customer Log': 'سجل العملاء',
    'Chats': 'المحادثات',
    'Access restricted to the support team only.': 'الدخول مقصور على فريق الدعم فقط.',
    'Registered customers and every order & repair request in the system.': 'العملاء المسجلون وكل الطلبات وبلاغات الصيانة في النظام.',
    'Customer conversations from the Contact Us bot.': 'محادثات العملاء من مساعد تواصل معنا.',
    'Gallery': 'معرض الصور',
    'Image URL to add...': 'رابط الصورة الجديدة...',
    'Add Image': 'إضافة صورة',
    'Delete current image': 'حذف الصورة الحالية',
    'No images yet — add one from the Admin account.': 'لا توجد صور بعد — أضفها من حساب المسؤول.',
    'Image added to the gallery.': 'تمت إضافة الصورة إلى المعرض.',
    'Delete the current gallery image?': 'حذف الصورة الحالية من المعرض؟',
    'Image removed.': 'تم حذف الصورة.',
    'Only admins can edit the gallery.': 'المعرض متاح للتعديل من المسؤولين فقط.',
    'Repair Service': 'خدمة صيانة',
    'Payment method': 'طريقة الدفع',
    'Cash': 'نقدي',
    'via': 'عبر',
    'Serial / Model': 'السيريال / الموديل',
    'Compressor': 'الكومبريسور',
    'Fan': 'المروحة',
    'Additional Repair Image': 'صورة صيانة إضافية',
    'Repair Photos': 'صور الصيانة',
    'Add the 4 repair photos': 'أضف صور الصيانة الأربع',
    'Save Photos': 'حفظ الصور',
    'Pick at least one photo first.': 'اختر صورة واحدة على الأقل أولاً.',
    'Repair photos saved.': 'تم حفظ صور الصيانة.',
    'Get It': 'سحب – استلام',
    'Add Employee': 'إضافة موظف',
    'Category': 'الفئة', 'Position': 'الوظيفة',
    'Technical': 'الفريق الفني', 'Customer Service': 'خدمة العملاء',
    'Executive Director': 'المدير التنفيذي',
    'Technical Manager': 'مدير فني', 'Area Supervisor': 'مشرف منطقة', 'Assistant': 'مساعد',
    'Administrative Manager': 'مدير إداري', 'Customer Service Representative': 'ممثل خدمة العملاء',
    'Financial Manager': 'مدير مالي', 'Accountant': 'محاسب',
    'Add Technical and Customer Service employees (Admin and Executive Director only)': 'إضافة موظفي الفريق الفني وخدمة العملاء (للمسؤول الرئيسي والمدير التنفيذي فقط)',
    'All employee accounts added by the Admin and the Executive Director': 'جميع حسابات الموظفين التي أضافها المسؤول الرئيسي والمدير التنفيذي',
    'Only the Admin or the Executive Director can add employees.': 'المسؤول الرئيسي أو المدير التنفيذي فقط يمكنه إضافة الموظفين.',
    'Only the Admin can add or delete an Executive Director.': 'المسؤول الرئيسي فقط يمكنه إضافة أو حذف المدير التنفيذي.',
    'Executive Director — works alongside the Admin with full access to the whole website.': 'المدير التنفيذي — يعمل بجانب المسؤول الرئيسي بصلاحية كاملة على الموقع بالكامل.'
});

const AR_PATTERNS = [
    [/^Welcome back, (.+)!$/, m => `مرحباً بعودتك، ${m[1]}!`],
    [/^Welcome back, (.+)$/, m => `مرحباً بعودتك، ${m[1]}`],
    [/^Welcome (.+)! Your account has been registered\.$/, m => `مرحباً ${m[1]}! تم تسجيل حسابك.`],
    [/^Task Log — (.+)$/, m => `سجل المهام — ${m[1]}`],
    [/^Completed (.+)$/, m => `اكتمل ${m[1]}`],
    [/^Ref: (.+)$/, m => `المرجع: ${m[1]}`],
    [/^(\+ )?([\d,.]+) EGP$/, m => `${m[1] || ''}${m[2]} جنيه`],
    [/^Customer @(\S+) \((.*?)\) — Location: (.*?)\. Order Ref: ([\w-]+)\.(.*)$/, m => {
        const rest = m[5].replace(/ Part needed: (.*?)\./, ' القطعة المطلوبة: $1.').replace(/ Continues ([\w-]+)\./, ' استكمال للمهمة $1.');
        const loc = m[3] === 'N/A' ? 'غير متاح' : getLocationLabel(m[3]);
        return `العميل @${m[1]} (${m[2]}) — الموقع: ${loc}. رقم الطلب: ${m[4]}.${rest}`;
    }],
    [/^Customer @(\S+) \((.*?)\) — Location: (.*?)\.(.*)$/, m => {
        const rest = m[4].replace(/ Part needed: (.*?)\./, ' القطعة المطلوبة: $1.').replace(/ Continues ([\w-]+)\./, ' استكمال للمهمة $1.');
        const loc = m[3] === 'N/A' ? 'غير متاح' : getLocationLabel(m[3]);
        return `العميل @${m[1]} (${m[2]}) — الموقع: ${loc}.${rest}`;
    }],
    [/^Are you sure you want to delete (user|order) "(.*)"\?$/, m => `هل أنت متأكد أنك تريد حذف ${m[1] === 'user' ? 'المستخدم' : 'الطلب'} "${m[2]}"؟`],
    [/^Task (\S+) updated to (.+)$/, m => `تم تحديث المهمة ${m[1]} إلى ${trCore(m[2]) || m[2]}`],
    [/^Order (\S+) updated to (.+)$/, m => `تم تحديث الطلب ${m[1]} إلى ${trCore(m[2]) || m[2]}`],
    [/^Undone — task (\S+) is back to (.+)$/, m => `تم التراجع — عادت المهمة ${m[1]} إلى ${trCore(m[2]) || m[2]}`],
    [/^Task (\S+) can't move from (.+) to (.+)\.$/, m => `لا يمكن نقل المهمة ${m[1]} من ${trCore(m[2]) || m[2]} إلى ${trCore(m[3]) || m[3]}.`],
    [/^Task (\S+) declined\. It has been sent back for reassignment\.$/, m => `تم رفض المهمة ${m[1]}. أُعيدت لإعادة التعيين.`],
    [/^Task assigned to (@\S+)\.$/, m => `تم تعيين المهمة إلى ${m[1]}.`],
    [/^Task withdrawn from (@\S+) and reassigned to (@\S+)\.$/, m => `تم سحب المهمة من ${m[1]} وإعادة تعيينها إلى ${m[2]}.`],
    [/^"(.+)" is already in the list\.$/, m => `"${m[1]}" موجودة بالفعل في القائمة.`],
    [/^Area "(.+)" added — customers can pick it right away\.$/, m => `تمت إضافة المنطقة "${m[1]}" — يمكن للعملاء اختيارها فوراً.`],
    [/^Area "(.+)" removed\.$/, m => `تم حذف المنطقة "${m[1]}".`],
    [/^(.+) account created for (.+)\.$/, m => `تم إنشاء حساب ${trCore(m[1]) || m[1]} لـ ${m[2]}.`]
];

function arHas(key) { return Object.prototype.hasOwnProperty.call(AR_UI, key); }

// Returns the Arabic for one trimmed, whitespace-collapsed string, or null if there is none.
function trCore(s, depth = 0) {
    if (arHas(s)) return AR_UI[s];
    for (const [re, fn] of AR_PATTERNS) {
        const m = s.match(re);
        if (m) return fn(m);
    }
    if (depth < 2) {
        let m = s.match(/^([^:]{2,60}): (.+)$/);            // "Repair Request: Name"
        if (m) {
            const a = trCore(m[1], depth + 1), b = trCore(m[2], depth + 1);
            if (a !== null || b !== null) return `${a !== null ? a : m[1]}: ${b !== null ? b : m[2]}`;
        }
        m = s.match(/^(.+?) \((.+)\)$/);                     // "Name (extra)"
        if (m) {
            const a = trCore(m[1], depth + 1), b = trCore(m[2], depth + 1);
            if (a !== null || b !== null) return `${a !== null ? a : m[1]} (${b !== null ? b : m[2]})`;
        }
    }
    return null;
}

function trText(raw) {
    if (!raw || !/[A-Za-z]/.test(raw)) return raw;
    const core = raw.replace(/\s+/g, ' ').trim();
    const out = core ? trCore(core) : null;
    if (out === null || out === core) return raw;
    return raw.match(/^\s*/)[0] + out + raw.match(/\s*$/)[0];
}

// Product / service / area names come from the app's own data, so map them in as well.
function buildArDynamic() {
    const add = (en, ar) => { if (en && ar && !arHas(en)) AR_UI[en] = ar; };
    [...INITIAL_PRODUCTS, ...(state.products || [])].forEach(p => {
        const tr = PRODUCT_TRANSLATIONS[p.id];
        if (tr) { add(p.name, tr.name); add(p.category, tr.category); add(p.specs, tr.specs); }
    });
    [...INITIAL_TECH_SERVICES, ...(state.services || [])].forEach(sv => {
        const tr = SERVICE_TRANSLATIONS[sv.id];
        if (tr) { add(sv.name, tr.name); add(sv.desc, tr.desc); }
    });
    Object.keys(LOCATION_AR).forEach(k => add(k, LOCATION_AR[k]));
    (state.areas || []).forEach(a => add(a.name, a.nameAr));
}

const AR_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

function arFixText(node) {
    const before = node.nodeValue;
    const after = trText(before);
    if (after !== before) node.nodeValue = after;
}

function arFixAttrs(el) {
    AR_ATTRS.forEach(a => {
        if (!el.hasAttribute || !el.hasAttribute(a)) return;
        const before = el.getAttribute(a);
        const after = trText(before);
        if (after !== before) el.setAttribute(a, after);
    });
}

function arTranslateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { arFixText(root); return; }
    if (root.nodeType !== 1) return;
    if (/^(SCRIPT|STYLE|NOSCRIPT)$/.test(root.tagName)) return;
    arFixAttrs(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
        acceptNode: n => (n.nodeType === 1 && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(n.tagName)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    let n;
    while ((n = walker.nextNode())) {
        if (n.nodeType === 3) arFixText(n); else arFixAttrs(n);
    }
}

function startArabicLayer() {
    if (window.__arLayerOn) return;
    window.__arLayerOn = true;
    buildArDynamic();
    document.title = trText(document.title);
    arTranslateTree(document.body);
    new MutationObserver(mutations => {
        buildArDynamic();
        mutations.forEach(m => {
            if (m.type === 'childList') m.addedNodes.forEach(arTranslateTree);
            else if (m.type === 'characterData') arFixText(m.target);
            else if (m.type === 'attributes') arFixAttrs(m.target);
        });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: AR_ATTRS });
}

// ================= DYNAMIC NAVIGATION & HISTORY API =================
function navigateTo(viewId, fromHistory = false) {
    if (viewId === 'user-dashboard') {
        viewId = 'customer-dashboard';
    }

    // Technicians get their own simplified "Home" (today's active tasks)
    // instead of the public marketing homepage — redirect them transparently.
    if (viewId === 'home' && state.currentUser && state.currentUser.role === 'technician') {
        viewId = 'tech-home';
    }

    // Technicians get their own dedicated task-log page instead of the
    // admin table dashboard — redirect them transparently.
    // Customer Services don't use the Repairs page.
    if (viewId === 'tech-fix' && state.currentUser && state.currentUser.role === 'hr') {
        viewId = 'admin-dashboard';
    }

    if (viewId === 'admin-dashboard' && state.currentUser && state.currentUser.role === 'technician') {
        viewId = 'tech-dashboard';
    }

    if (viewId === 'admin-dashboard' && (!state.currentUser || !isStaffRole(state.currentUser.role))) {
        showToast('Access restricted to administrators only.', 'error');
        try { history.replaceState({ view: 'home' }, '', '#home'); } catch (e) { }
        navigateTo('home', true);
        return;
    }

    if (viewId === 'customer-log' && (!state.currentUser || !isStaffRole(state.currentUser.role) || state.currentUser.role === 'technician')) {
        showToast('Access restricted to administrators only.', 'error');
        try { history.replaceState({ view: 'home' }, '', '#home'); } catch (e) { }
        navigateTo('home', true);
        return;
    }

    if (viewId === 'chats' && (!state.currentUser || (!isTopAdmin(state.currentUser.role) && state.currentUser.role !== 'hr'))) {
        showToast('Access restricted to the support team only.', 'error');
        try { history.replaceState({ view: 'home' }, '', '#home'); } catch (e) { }
        navigateTo('home', true);
        return;
    }

    if (viewId === 'tech-home' && (!state.currentUser || state.currentUser.role !== 'technician')) {
        showToast('Access restricted to technicians only.', 'error');
        try { history.replaceState({ view: 'home' }, '', '#home'); } catch (e) { }
        navigateTo('home', true);
        return;
    }

    if (viewId === 'tech-dashboard' && (!state.currentUser || state.currentUser.role !== 'technician')) {
        showToast('Access restricted to technicians only.', 'error');
        try { history.replaceState({ view: 'home' }, '', '#home'); } catch (e) { }
        navigateTo('home', true);
        return;
    }

    if (viewId === 'customer-dashboard' && !state.currentUser) {
        showToast('Please login to view your dashboard.', 'error');
        try { history.replaceState({ view: 'home' }, '', '#home'); } catch (e) { }
        openAuthModal();
        return;
    }

    if (!fromHistory) {
        try {
            history.pushState({ view: viewId }, '', '#' + viewId);
        } catch (e) {
            location.hash = '#' + viewId;
        }
    }

    // Remember the current view so a page refresh reopens it instead of bouncing to Home
    sessionStorage.setItem('ca_last_view', viewId);

    const views = ['home', 'products', 'tech-fix', 'customer-log', 'chats', 'admin-dashboard', 'tech-home', 'tech-dashboard', 'customer-dashboard', 'about', 'reviews', 'who-are-we', 'contact'];

    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');

        const navItem = document.getElementById(`nav-${v}`);
        if (navItem) {
            navItem.classList.remove('nav-link-active');
        }
    });

    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove('hidden');

    const activeNav = document.getElementById(`nav-${viewId}`) || (viewId === 'tech-home' ? document.getElementById('nav-home') : null);
    if (activeNav) {
        activeNav.classList.add('nav-link-active');
    }

    if (!fromHistory) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (viewId === 'home') { renderHomeGallery(); syncHomeGalleryFromCloud(); }
    if (viewId === 'products') renderProducts();
    if (viewId === 'tech-fix') renderTechServices();
    if (viewId === 'admin-dashboard') renderAdminDashboard();
    if (viewId === 'tech-home') renderTechHome();
    if (viewId === 'tech-dashboard') renderTechDashboard();
    if (viewId === 'customer-dashboard') renderCustomerDashboard();
    if (viewId === 'who-are-we') renderWhoWeAreDetails();
    if (viewId === 'reviews') renderReviewsPage();
    if (viewId === 'contact') renderContactPage();
    if (viewId === 'customer-log' || viewId === 'chats') renderAdminDashboard();
    if (viewId === 'about') renderPolicies();
}

// Returns the id (without the "view-" prefix) of whichever section is currently visible
function getCurrentViewId() {
    const views = ['home', 'products', 'tech-fix', 'customer-log', 'chats', 'admin-dashboard', 'tech-home', 'tech-dashboard', 'customer-dashboard', 'about', 'reviews', 'who-are-we', 'contact'];
    for (const v of views) {
        const el = document.getElementById(`view-${v}`);
        if (el && !el.classList.contains('hidden')) return v;
    }
    return 'home';
}

// Re-renders whatever the person is currently looking at instead of bouncing them to Home
function refreshCurrentView() {
    const current = getCurrentViewId();
    if (current === 'products') renderProducts();
    if (current === 'tech-fix') renderTechServices();
    if (current === 'admin-dashboard') renderAdminDashboard();
    if (current === 'tech-home') renderTechHome();
    if (current === 'tech-dashboard') renderTechDashboard();
    if (current === 'customer-dashboard') renderCustomerDashboard();
    if (current === 'who-are-we') renderWhoWeAreDetails();
    if (current === 'reviews') renderReviewsPage();
    if (current === 'contact') renderContactPage();
    if (current === 'about') renderPolicies();
    renderAuthBox();
    applyRoleBasedNav();
}

function handleHistoryNavigation(e) {
    const targetView = (e && e.state && e.state.view) || (location.hash ? location.hash.replace('#', '') : 'home');
    navigateTo(targetView, true);
}

window.addEventListener('popstate', handleHistoryNavigation);
window.addEventListener('hashchange', handleHistoryNavigation);

function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        html.classList.add('light');
        localStorage.setItem('ca_theme', 'light');
    } else {
        html.classList.remove('light');
        html.classList.add('dark');
        localStorage.setItem('ca_theme', 'dark');
    }
}

function openTranslateNotice() {
    toggleLanguage();
}

// includeOther = true adds the "Other Area" choice (used by product orders only).
function getLocationOptionsHtml(selectedLocation = '', includeOther = false) {
    const names = (state.areas || []).map(a => a.name);
    if (includeOther) names.push(OTHER_AREA);
    return [`<option value="">${t('select_location_default', 'Select location...')}</option>`]
        .concat(names.map(location => {
            const selected = location === selectedLocation ? 'selected' : '';
            return `<option value="${escapeHtml(location)}" ${selected}>${escapeHtml(getLocationLabel(location))}</option>`;
        }))
        .join('');
}

if (localStorage.getItem('ca_theme') === 'dark') {
    document.documentElement.classList.add('dark');
}

// ================= AUTHENTICATION LOGIC =================
function openAuthModal() {
    const form = document.getElementById('authForm');
    if (form) form.reset();
    clearAuthErrors();
    document.getElementById('authModal').classList.remove('hidden');
}

function closeAuthModal() {
    const form = document.getElementById('authForm');
    if (form) form.reset();
    clearAuthErrors();
    document.getElementById('authModal').classList.add('hidden');
}

function clearAuthErrors() {
    ['authUsernameError', 'authWhatsAppError', 'authContactError', 'authPasswordError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

function showAuthFieldError(elementId, textElementId, message) {
    const el = document.getElementById(elementId);
    const textEl = document.getElementById(textElementId);
    if (textEl) textEl.textContent = message;
    if (el) el.classList.remove('hidden');
}

function toggleAuthMode(mode) {
    state.authMode = mode;
    clearAuthErrors();
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const submitBtn = document.getElementById('authSubmitBtn');
    const extraFields = document.getElementById('signupExtraFields');
    const passInput = document.getElementById('authPassword');

    // Clear all form fields when switching tabs to prevent credentials from carrying over
    document.getElementById('authUsername').value = '';
    document.getElementById('authPassword').value = '';
    document.getElementById('authFullName').value = '';
    document.getElementById('authWhatsApp').value = '';
    document.getElementById('authContactPhone').value = '';

    if (mode === 'login') {
        tabLogin.className = 'py-2 rounded-lg bg-white dark:bg-slate-700 shadow text-sky-500';
        tabSignup.className = 'py-2 rounded-lg text-slate-500';
        submitBtn.innerText = t('btn_login', 'Login to Cooling Art');
        extraFields.classList.add('hidden');
        document.getElementById('authFullName').required = false;
        document.getElementById('authWhatsApp').required = false;
        document.getElementById('authContactPhone').required = false;
        passInput.setAttribute('autocomplete', 'current-password');
        const fpBox = document.getElementById('forgotPasswordBox');
        if (fpBox) fpBox.classList.remove('hidden');
    } else {
        tabSignup.className = 'py-2 rounded-lg bg-white dark:bg-slate-700 shadow text-sky-500';
        tabLogin.className = 'py-2 rounded-lg text-slate-500';
        submitBtn.innerText = t('btn_register', 'Register New Account');
        extraFields.classList.remove('hidden');
        document.getElementById('authFullName').required = true;
        document.getElementById('authWhatsApp').required = true;
        document.getElementById('authContactPhone').required = true;
        passInput.setAttribute('autocomplete', 'new-password');
        const fpBox = document.getElementById('forgotPasswordBox');
        if (fpBox) fpBox.classList.add('hidden');
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    clearAuthErrors();
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    const dummyEmail = getSupabaseEmail(username);

    if (state.authMode === 'signup') {
        const name = document.getElementById('authFullName').value.trim();
        const whatsapp = document.getElementById('authWhatsApp').value.trim();
        const contactPhone = document.getElementById('authContactPhone').value.trim();
        const phoneRegex = /^\d{11}$/;

        // Password: min 6 chars, only letters/digits/underscores (no spaces or special chars)
        const passwordRegex = /^[A-Za-z0-9_]{6,}$/;
        if (!passwordRegex.test(password)) {
            const msg = password.length < 6
                ? (state.currentLang === 'ar' ? 'كلمة السر يجب أن تكون 6 أحرف على الأقل.' : 'Password must be at least 6 characters.')
                : (state.currentLang === 'ar' ? 'كلمة السر لا تحتوي على مسافات أو رموز خاصة.' : 'No spaces or special characters allowed.');
            showAuthFieldError('authPasswordError', 'authPasswordErrorText', msg);
            return;
        }

        if (!phoneRegex.test(whatsapp)) {
            showAuthFieldError('authWhatsAppError', 'authWhatsAppErrorText',
                state.currentLang === 'ar' ? 'رقم الواتساب يجب أن يكون 11 رقماً.' : 'WhatsApp number must be exactly 11 digits.');
            return;
        }

        if (!phoneRegex.test(contactPhone)) {
            showAuthFieldError('authContactError', 'authContactErrorText',
                state.currentLang === 'ar' ? 'رقم التواصل يجب أن يكون 11 رقماً.' : 'Contact number must be exactly 11 digits.');
            return;
        }

        const usernameExists = state.users.some(u => u.username.toLowerCase() === username.toLowerCase());
        if (usernameExists) {
            document.getElementById('authUsernameError').classList.remove('hidden');
            return;
        }

        const whatsappExists = state.users.some(u => u.whatsapp && u.whatsapp.trim() === whatsapp);
        if (whatsappExists) {
            showAuthFieldError('authWhatsAppError', 'authWhatsAppErrorText',
                state.currentLang === 'ar' ? 'رقم الواتساب مستخدم بالفعل.' : 'WhatsApp number already taken.');
            return;
        }

        const contactExists = state.users.some(u => u.contactPhone && u.contactPhone.trim() === contactPhone);
        if (contactExists) {
            const contactError = document.getElementById('authContactError');
            if (contactError) contactError.classList.remove('hidden');
            return;
        }

        // Register in Supabase using mapped email
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: dummyEmail,
                    password: password,
                    options: {
                        data: {
                            username: username,
                            name: name || username,
                            whatsapp: whatsapp,
                            contactPhone: contactPhone,
                            role: 'customer'
                        }
                    }
                });
                if (error) {
                    console.warn('[Supabase Auth] SignUp notice/warning:', error.message);
                } else {
                    console.log('[Supabase Auth] Registered successfully with internal email:', dummyEmail);
                }
            } catch (sbErr) {
                console.warn('[Supabase Auth] Exception during signup:', sbErr);
            }
        }

        const newUser = {
            id: createDateBasedId('USR'),
            username: username,
            password: await hashPassword(password),
            role: 'customer',
            name: name || username,
            whatsapp: whatsapp,
            contactPhone: contactPhone,
            joinedDate: getLocalDateString()
        };

        state.users.push(newUser);
        state.currentUser = newUser;
        saveState();
        showToast(`Welcome ${newUser.name}! Your account has been registered.`, 'success');
    } else {
        let authenticatedUser = null;

        // 1. Attempt Supabase login behind the scenes with username mapped to @acsite.local
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: dummyEmail,
                    password: password
                });

                if (!error && data?.user) {
                    console.log('[Supabase Auth] Successfully logged in with internal email:', dummyEmail);
                    // Match with local state user record or create one if needed
                    authenticatedUser = state.users.find(u => u.username.toLowerCase() === username.toLowerCase());
                    if (!authenticatedUser) {
                        authenticatedUser = {
                            id: data.user.id || createDateBasedId('USR'),
                            username: username,
                            role: data.user.user_metadata?.role || (username.toLowerCase() === 'admin' ? 'head-admin' : 'customer'),
                            position: data.user.user_metadata?.position || null,
                            name: data.user.user_metadata?.name || username,
                            whatsapp: data.user.user_metadata?.whatsapp || '',
                            contactPhone: data.user.user_metadata?.contactPhone || '',
                            joinedDate: getLocalDateString()
                        };
                        state.users.push(authenticatedUser);
                    }
                } else {
                    console.warn('[Supabase Auth] Supabase authentication failed:', error?.message);
                    showToast(state.currentLang === 'ar' ? 'اسم المستخدم أو كلمة السر غير صحيحة!' : 'Invalid username or password!', 'error');
                    return;
                }
            } catch (sbErr) {
                console.warn('[Supabase Auth] Exception during login:', sbErr);
                showToast(state.currentLang === 'ar' ? 'حدث خطأ في الاتصال بالخادم.' : 'Server connection error.', 'error');
                return;
            }
        } else {
            // Fallback only if Supabase SDK is not initialized
            const hashedInput = await hashPassword(password);
            authenticatedUser = state.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === hashedInput);
        }

        if (!authenticatedUser) {
            showToast(state.currentLang === 'ar' ? 'اسم المستخدم أو كلمة السر غير صحيحة!' : 'Invalid username or password!', 'error');
            return;
        }

        state.currentUser = authenticatedUser;
        saveState();
        showToast(`Welcome back, ${authenticatedUser.name}!`, 'success');
    }

    closeAuthModal();
    botResetForAuthChange(); // Reset chatbot session for the new logged-in user
    renderApp();

    if (state.currentUser.role === 'technician') {
        navigateTo('home');
    } else if (isStaffRole(state.currentUser.role)) {
        navigateTo('admin-dashboard');
    } else {
        navigateTo('home');
    }
}

// ================= LOGOUT MODAL FUNCTIONS =================

function openLogoutModal() {
    document.getElementById('logoutModal').classList.remove('hidden');
}

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.add('hidden');
}

function confirmLogout() {
    closeLogoutModal();
    if (supabaseClient) {
        supabaseClient.auth.signOut().catch(err => console.warn('[Supabase Auth] SignOut warning:', err));
    }
    state.currentUser = null;
    saveState();
    sessionStorage.setItem('ca_last_view', 'home');

    try {
        history.replaceState({ view: 'home' }, '', '#home');
    } catch (e) {
        location.hash = '#home';
    }

    const form = document.getElementById('authForm');
    if (form) form.reset();

    showToast('Logged out safely.', 'info');
    botResetForAuthChange(); // Reset chatbot session after logout
    renderApp();
    navigateTo('home', true);
}

// ================= DELETE USER MODAL FUNCTIONS =================
let orderToDeleteId = null;

function openDeleteUserModal(userId, username) {
    orderToDeleteId = null;
    const targetUser = state.users.find(u => u.id === userId);
    if (targetUser && targetUser.role === 'head-admin') {
        showToast('The head admin account cannot be deleted.', 'error');
        return;
    }
    if (targetUser && targetUser.role === 'executive' && (!state.currentUser || state.currentUser.role !== 'head-admin')) {
        showToast('Only the Admin can add or delete an Executive Director.', 'error');
        return;
    }
    userToDeleteId = userId;
    document.getElementById('deleteUserModalMsg').innerText = `Are you sure you want to delete user "${username}"?`;
    document.getElementById('deleteUserModal').classList.remove('hidden');
}

function openDeleteOrderModal(orderId, title) {
    userToDeleteId = null;
    orderToDeleteId = orderId;
    document.getElementById('deleteUserModalMsg').innerText = `Are you sure you want to delete order "${title}"?`;
    document.getElementById('deleteUserModal').classList.remove('hidden');
}

function closeDeleteUserModal() {
    userToDeleteId = null;
    orderToDeleteId = null;
    document.getElementById('deleteUserModal').classList.add('hidden');
}

function confirmDeleteUser() {
    if (!state.currentUser || !isTopAdmin(state.currentUser.role)) {
        showToast('Only the head admin can delete users and orders.', 'error');
        closeDeleteUserModal();
        return;
    }

    if (orderToDeleteId) {
        purgeOrders(order => order.id === orderToDeleteId);
        saveState();
        closeDeleteUserModal();
        showToast('Order successfully deleted!', 'success');
        renderAdminDashboard();
        return;
    }

    if (!userToDeleteId) return;

    const targetUser = state.users.find(u => u.id === userToDeleteId);
    if (!targetUser) {
        closeDeleteUserModal();
        return;
    }

    if (targetUser.role === 'head-admin') {
        showToast('The head admin account cannot be deleted.', 'error');
        closeDeleteUserModal();
        return;
    }
    if (targetUser.role === 'executive' && state.currentUser.role !== 'head-admin') {
        showToast('Only the Admin can add or delete an Executive Director.', 'error');
        closeDeleteUserModal();
        return;
    }

    state.users = state.users.filter(u => u.id !== userToDeleteId);
    if (targetUser.role === 'technician') {
        // Their unfinished tasks go back to the "Not Assigned" pile.
        state.tasks.forEach(t => {
            if (t.assignedTo === targetUser.username && t.status !== 'Done') {
                t.assignedTo = '';
                t.unassignedSince = new Date().toISOString();
                if (t.status === 'In Progress') {
                    t.status = 'Open';
                    const o = t.orderId ? state.orders.find(x => x.id === t.orderId) : null;
                    if (o) o.status = getOrderStatusForTask(t, 'Open');
                }
            }
        });
    } else if (!isStaffRole(targetUser.role)) {
        // A deleted customer takes their orders and tasks with them.
        purgeOrders(o => String(o.username).toLowerCase() === targetUser.username.toLowerCase());
    }
    saveState();
    closeDeleteUserModal();
    showToast('User successfully deleted!', 'success');
    renderAdminDashboard();
}

// ================= NAVBAR USER STATUS DISPLAY =================
function renderAuthBox() {
    const box = document.getElementById('authNavBox');
    if (state.currentUser) {
        const isNavAdmin = isStaffRole(state.currentUser.role);
        const isTechnicianUser = state.currentUser.role === 'technician';
        let displayName = state.currentUser.name || state.currentUser.username;
        if (isNavAdmin && displayName === 'System Administrator') {
            displayName = 'System Admin';
        }

        const roleLabel = getPositionLabel(state.users.find(u => u.id === state.currentUser.id) || state.currentUser);
        box.innerHTML = `
            <div class="flex items-center space-x-2">
                <button onclick="navigateTo('${isNavAdmin ? 'admin-dashboard' : 'customer-dashboard'}')" class="text-xs font-bold px-2.5 sm:px-3 h-9 sm:h-auto sm:py-2 rounded-xl bg-sky-50 dark:bg-slate-800 border border-sky-200 dark:border-slate-700 text-sky-600 dark:text-sky-400 hover:bg-sky-100 transition flex items-center gap-2 shadow-sm">
                    <i class="fa-solid ${isNavAdmin ? 'fa-user-shield text-amber-500' : (isTechnicianUser ? 'fa-user-gear text-sky-500' : 'fa-circle-user text-sky-500')} text-sm"></i>
                    <span class="whitespace-nowrap hidden sm:inline">${displayName}</span>
                    <span class="text-[9px] bg-slate-900 text-white font-extrabold px-1.5 py-0.5 rounded uppercase ml-1 hidden sm:inline">${roleLabel}</span>
                </button>
                <button onclick="openLogoutModal()" class="text-xs font-bold text-red-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800 transition" title="Logout">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        `;
    } else {
        box.innerHTML = `
            <button onclick="openAuthModal()" class="bg-sky-500 hover:bg-sky-600 text-white font-bold px-3 sm:px-4 h-9 sm:h-auto sm:py-2 rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-sky-500/20 flex items-center gap-2">
                <i class="fa-solid fa-user-plus"></i>
                <span class="hidden sm:inline">${t('btn_login_signup', 'Login / Sign Up')}</span>
            </button>
        `;
    }
}


// ================= HOMEPAGE IMAGE GALLERY (auto-sweep + manual bar, admin-editable) =================
// The banner image itself IS the gallery — there is no separate static hero
// photo. It sweeps automatically every few seconds; hovering pauses it. A
// small dot bar sits at the bottom of the image for manual navigation (the
// images are never repeated in the bar, just indicator dots).
// Head admin / admin can add photos straight from their device and delete
// the current one (stored as compressed base64 in 'ca_home_gallery').
const GALLERY_SWEEP_MS = 4000;
const GALLERY_MAX_DIMENSION = 1600;
let galleryIndex = 0;
let galleryTimer = null;

// Gallery is stored in Supabase (table "site_gallery") so it survives deploys,
// and mirrored in localStorage for instant first paint / offline use.
let galleryCache = null;
let galleryLastCloudSync = 0;

function isPlaceholderGalleryItem(g) {
    return !g || !g.url || /^g[123]$/.test(String(g.id || '')) || String(g.url).includes('picsum.photos');
}

function loadHomeGallery() {
    if (galleryCache) return galleryCache;
    try {
        const stored = JSON.parse(localStorage.getItem('ca_home_gallery'));
        if (Array.isArray(stored)) {
            galleryCache = stored.filter(g => !isPlaceholderGalleryItem(g));
            return galleryCache;
        }
    } catch (e) { /* fall through */ }
    galleryCache = []; // no built-in placeholder images any more
    return galleryCache;
}

function saveHomeGallery(images) {
    galleryCache = images;
    localStorage.setItem('ca_home_gallery', JSON.stringify(images));
}

function galleryCloudWarn(error) {
    console.warn('[Gallery Sync]', error && error.message, error);
    showToast(L('Image saved on this device only — cloud save failed (check the site_gallery table / RLS in Supabase).',
        'تم حفظ الصورة على هذا الجهاز فقط — فشل الحفظ السحابي (راجع جدول site_gallery وسياسات RLS في Supabase).'), 'error');
}

async function galleryCloudInsert(items) {
    if (!supabaseClient) return;
    const base = Date.now();
    const rows = items.map((g, i) => ({
        id: g.id, url: g.url, title: g.title || '', added_by: g.addedBy || '',
        sort_order: g.sort || (base + i)
    }));
    try {
        const { error } = await supabaseClient.from('site_gallery').upsert(rows);
        if (error) galleryCloudWarn(error);
    } catch (err) { galleryCloudWarn(err); }
}

async function galleryCloudDelete(id) {
    if (!supabaseClient || !id) return;
    try {
        const { error } = await supabaseClient.from('site_gallery').delete().eq('id', id);
        if (error) galleryCloudWarn(error);
    } catch (err) { galleryCloudWarn(err); }
}

// Pulls the shared gallery from Supabase (throttled) and re-renders only if it changed.
async function syncHomeGalleryFromCloud(force) {
    if (!supabaseClient) return;
    if (!force && Date.now() - galleryLastCloudSync < 30000) return;
    galleryLastCloudSync = Date.now();
    try {
        const { data, error } = await supabaseClient.from('site_gallery').select('*').order('sort_order', { ascending: true });
        if (error) { console.warn('[Gallery Sync] load failed:', error.message); return; }
        const local = loadHomeGallery();
        if (data && data.length) {
            const remote = data.map(r => ({ id: r.id, url: r.url, title: r.title || '', addedBy: r.added_by || '', sort: r.sort_order }));
            const changed = remote.length !== local.length || remote.some((g, i) => g.id !== local[i].id);
            saveHomeGallery(remote);
            if (changed) {
                if (galleryIndex > remote.length - 1) galleryIndex = 0;
                if (document.getElementById('homeGallerySection')) renderHomeGallery();
            }
        } else if (local.length && typeof canEditAbout === 'function' && canEditAbout()) {
            // First run after deploy: push the images this admin already has on this device to the cloud.
            await galleryCloudInsert(local.map((g, i) => ({ ...g, sort: Date.now() + i })));
        } else if (local.length) {
            saveHomeGallery([]);
            if (document.getElementById('homeGallerySection')) renderHomeGallery();
        }
    } catch (err) { console.warn('[Gallery Sync] exception:', err); }
}
window.syncHomeGalleryFromCloud = syncHomeGalleryFromCloud;

function ensureHomeGallerySection() {
    const home = document.getElementById('view-home');
    if (!home || document.getElementById('homeGallerySection')) return;
    const hero = document.getElementById('homeHeroBleed');
    if (!hero) return;
    const wrap = document.createElement('div');
    wrap.id = 'homeGallerySection';
    hero.appendChild(wrap);
}

function renderHomeGallery() {
    ensureHomeGallerySection();
    const box = document.getElementById('homeGallerySection');
    if (!box) return;
    const canEdit = canEditAbout();
    const images = loadHomeGallery();
    if (galleryIndex > images.length - 1) galleryIndex = 0;

    const slides = images.map(g => `
        <div class="w-full shrink-0">
            <img src="${escapeHtml(g.url)}" onerror="this.onerror=null;this.src=PRODUCT_PLACEHOLDER_IMG" class="home-hero-img w-full object-cover select-none" alt="${escapeHtml(g.title || 'Cooling Art')}">
        </div>`).join('');
    // A clone of the FIRST slide appended after the real last one — lets the
    // track keep sliding forward at the wrap point (…→last→[clone of 1]) and
    // then snap back to the real first slide instantly, so the loop reads as
    // one continuous forward motion (1→2→3→1→2→3…) with no rewind.
    const loopSlide = images.length > 1 ? `
        <div class="w-full shrink-0">
            <img src="${escapeHtml(images[0].url)}" onerror="this.onerror=null;this.src=PRODUCT_PLACEHOLDER_IMG" class="home-hero-img w-full object-cover select-none" alt="${escapeHtml(images[0].title || 'Cooling Art')}">
        </div>` : '';

    // Small dot bar at the bottom of the image — manual navigation only,
    // the images themselves are never repeated here.
    const dots = images.map((g, i) => `
        <button type="button" onclick="jumpHomeGallery(${i})" aria-label="Image ${i + 1} of ${images.length}"
            class="home-gallery-dot rounded-full transition ${i === galleryIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}"></button>`).join('');

    box.innerHTML = `
    <div dir="ltr">
        <div class="relative group overflow-hidden">
            <div id="homeGalleryTrack" class="flex transition-transform duration-700 ease-in-out" style="transform: translateX(-${galleryIndex * 100}%);">
                ${slides || (canEdit ? `<div class="w-full p-10 text-center text-xs text-slate-400">${L('No images yet — add one from the Admin account.', 'لا توجد صور بعد — أضفها من حساب المسؤول.')}</div>` : '')}${loopSlide}
            </div>
            ${images.length > 1 ? `
            <button type="button" onclick="stepHomeGallery()" class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-sky-500 text-white flex items-center justify-center transition opacity-0 group-hover:opacity-100" title="${L('Next', 'التالي')}"><i class="fa-solid fa-chevron-right"></i></button>
            <div id="homeGalleryBar" class="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/35 backdrop-blur-sm rounded-full px-2.5 py-2">${dots}</div>
            ` : ''}
            ${canEdit ? `
            <div class="absolute top-3 right-3 flex items-center gap-2">
                <input type="file" id="homeGalleryFileInput" accept="image/*" class="hidden" onchange="handleAddGalleryImageFile(event)">
                <button type="button" onclick="document.getElementById('homeGalleryFileInput').click()" title="${L('Add image from device', 'إضافة صورة من الجهاز')}" class="w-9 h-9 rounded-full bg-black/50 hover:bg-sky-500 text-white flex items-center justify-center transition"><i class="fa-solid fa-plus text-xs"></i></button>
                ${images.length ? `<button type="button" onclick="removeHomeGalleryImage()" title="${L('Delete current image', 'حذف الصورة الحالية')}" class="w-9 h-9 rounded-full bg-black/50 hover:bg-red-600 text-white flex items-center justify-center transition"><i class="fa-solid fa-trash-can text-xs"></i></button>` : ''}
            </div>
            ` : ''}
        </div>
    </div>`;

    startHomeGalleryTimer();
}

function startHomeGalleryTimer() {
    stopHomeGalleryTimer();
    if (loadHomeGallery().length < 2) return;
    galleryTimer = setInterval(() => stepHomeGallery(true), GALLERY_SWEEP_MS);
}
function stopHomeGalleryTimer() {
    if (galleryTimer) { clearInterval(galleryTimer); galleryTimer = null; }
}
function pauseHomeGallery() { stopHomeGalleryTimer(); }
function resumeHomeGallery() { startHomeGalleryTimer(); }

// Pending "snap back to the real first slide" timer — set right after we
// slide onto the appended clone slide, cleared if the user interacts again
// before it fires.
let gallerySnapTimeout = null;

// Always moves forward one slide — 1→2→3→…→last→1→2→3… — never backward.
function stepHomeGallery(fromTimer) {
    const images = loadHomeGallery();
    if (images.length < 2) return;
    if (gallerySnapTimeout) { clearTimeout(gallerySnapTimeout); gallerySnapTimeout = null; }
    galleryIndex++;
    applyHomeGalleryIndex();
    if (galleryIndex >= images.length) {
        // We've slid onto the cloned first slide at the end of the track.
        // Once that slide's-worth of animation finishes, snap back to the
        // real first slide with the transition switched off — invisible to
        // the eye since it's the same photo, but resets us to loop again.
        gallerySnapTimeout = setTimeout(() => {
            galleryIndex = 0;
            applyHomeGalleryIndex(true);
            gallerySnapTimeout = null;
        }, 720);
    }
    if (!fromTimer) startHomeGalleryTimer(); // manual use restarts the sweep clock
}

function jumpHomeGallery(i) {
    if (gallerySnapTimeout) { clearTimeout(gallerySnapTimeout); gallerySnapTimeout = null; }
    galleryIndex = i;
    applyHomeGalleryIndex();
    startHomeGalleryTimer();
}

function applyHomeGalleryIndex(instant) {
    const track = document.getElementById('homeGalleryTrack');
    if (track) {
        if (instant) track.style.transitionDuration = '0ms';
        track.style.transform = `translateX(-${galleryIndex * 100}%)`;
        if (instant) {
            void track.offsetWidth; // flush the instant jump before restoring the transition
            track.style.transitionDuration = '';
        }
    }
    const images = loadHomeGallery();
    const activeDot = images.length ? galleryIndex % images.length : 0;
    document.querySelectorAll('.home-gallery-dot').forEach((el, i) => {
        const active = i === activeDot;
        el.className = `home-gallery-dot rounded-full transition ${active ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}`;
    });
}

// Adds a gallery image picked from the admin's own device — read as a data
// URL, downsized/compressed on a canvas (keeps localStorage usage sane),
// then saved as base64. No external links involved.
function handleAddGalleryImageFile(e) {
    if (!canEditAbout()) {
        showToast(L('Only admins can edit the gallery.', 'المعرض متاح للتعديل من المسؤولين فقط.'), 'error');
        e.target.value = '';
        return;
    }
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // reset so the same file can be picked again later
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
        showToast(L('Please choose an image file.', 'يرجى اختيار ملف صورة.'), 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            let w = img.width, h = img.height;
            if (w > GALLERY_MAX_DIMENSION) { h = Math.round(h * GALLERY_MAX_DIMENSION / w); w = GALLERY_MAX_DIMENSION; }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            const images = loadHomeGallery();
            const newImg = { id: createDateBasedId('IMG'), url: dataUrl, title: '', addedBy: state.currentUser.username, addedAt: new Date().toISOString(), sort: Date.now() };
            images.push(newImg);
            try {
                saveHomeGallery(images);
                galleryCloudInsert([newImg]);
            } catch (err) {
                showToast(L('Storage is full — delete an old image first.', 'مساحة التخزين ممتلئة — احذف صورة قديمة أولاً.'), 'error');
                return;
            }
            galleryIndex = images.length - 1;
            renderHomeGallery();
            showToast(L('Image added to the gallery.', 'تمت إضافة الصورة إلى المعرض.'), 'success');
        };
        img.onerror = () => showToast(L('Could not read that image.', 'تعذّرت قراءة هذه الصورة.'), 'error');
        img.src = ev.target.result;
    };
    reader.onerror = () => showToast(L('Could not read that image.', 'تعذّرت قراءة هذه الصورة.'), 'error');
    reader.readAsDataURL(file);
}

function removeHomeGalleryImage() {
    if (!canEditAbout()) return;
    const images = loadHomeGallery();
    if (!images.length) return;
    if (!window.confirm(L('Delete the current gallery image?', 'حذف الصورة الحالية من المعرض؟'))) return;
    const removed = images.splice(galleryIndex, 1)[0];
    saveHomeGallery(images);
    if (removed) galleryCloudDelete(removed.id);
    if (galleryIndex > images.length - 1) galleryIndex = Math.max(images.length - 1, 0);
    renderHomeGallery();
    showToast(L('Image removed.', 'تم حذف الصورة.'), 'success');
}

// ================= RENDERING CATALOGS & DASHBOARDS =================
function renderProducts() {
    renderCatalogForms();
    const canEdit = canManageAreas();
    const query = (document.getElementById('productSearch')?.value || '').toLowerCase();
    const grid = document.getElementById('productsGrid');
    const isAr = state.currentLang === 'ar';

    const filtered = state.products.filter(p => String(p.name || '').toLowerCase().includes(query) || String(p.specs || '').toLowerCase().includes(query));

    grid.innerHTML = filtered.map(p => {
        const tr = (isAr && PRODUCT_TRANSLATIONS[p.id]) ? PRODUCT_TRANSLATIONS[p.id] : null;
        return `
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between group">
            <div>
                <div class="h-48 overflow-hidden bg-slate-100 relative">
                    <img src="${escapeHtml(p.image || PRODUCT_PLACEHOLDER_IMG)}" onerror="this.onerror=null;this.src=PRODUCT_PLACEHOLDER_IMG" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                    <span class="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">${escapeHtml(tr ? tr.category : p.category)}</span>
                    ${p.outOfStock ? `<span class="absolute bottom-3 left-3 bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase"><i class="fa-solid fa-circle-xmark me-1"></i>${t('out_of_stock')}</span>` : ''}
                    ${canEdit ? `<button type="button" onclick="openEditProductModal('${p.id}')" class="absolute top-3 right-12 w-8 h-8 rounded-full bg-white/90 text-sky-600 hover:bg-sky-500 hover:text-white flex items-center justify-center transition" title="${L('Edit product', 'تعديل المنتج')}"><i class="fa-solid fa-pen text-xs"></i></button><button type="button" onclick="removeProduct('${p.id}')" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition" title="${L('Remove product', 'حذف المنتج')}"><i class="fa-solid fa-trash-can text-xs"></i></button>` : ''}
                </div>
                <div class="p-5 space-y-2">
                    <h3 class="font-bold text-base leading-snug">${escapeHtml(tr ? tr.name : p.name)}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">${escapeHtml(tr ? tr.specs : (p.specs || ''))}</p>
                </div>
            </div>
            <div class="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">${t('price_label', 'Price')}</span>
                    <span class="text-lg font-extrabold text-sky-600 dark:text-sky-400">${Number(p.price).toLocaleString()} ${t('egp_symbol', 'EGP')}</span>
                    <span class="block text-[10px] font-bold ${p.outOfStock ? 'text-red-500' : 'text-emerald-500'}">${p.outOfStock ? t('out_of_stock') : t('in_stock')}</span>
                </div>
                ${p.outOfStock
                ? `<button disabled class="bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold px-4 py-2 rounded-xl text-xs cursor-not-allowed uppercase">${t('out_of_stock')}</button>`
                : `<button onclick="orderProductById('${p.id}')" class="bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition">${t('btn_order_unit', 'Order Unit')}</button>`}
            </div>
        </div>`;
    }).join('');
}

function renderTechServices() {
    renderAreasManager();
    renderCatalogForms();
    const canEdit = canManageAreas();
    const isAr = state.currentLang === 'ar';
    const grid = document.getElementById('techServicesGrid');
    grid.innerHTML = state.services.map(s => {
        const tr = (isAr && SERVICE_TRANSLATIONS[s.id]) ? SERVICE_TRANSLATIONS[s.id] : null;
        return `
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between group">
            <div>
                <div class="h-48 overflow-hidden bg-slate-100 relative">
                    <img src="${escapeHtml(s.image || PRODUCT_PLACEHOLDER_IMG)}" onerror="this.onerror=null;this.src=PRODUCT_PLACEHOLDER_IMG" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                    <span class="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">${s.id === 's5' ? L('Insurance', 'تأمين') : L('Repair Service', 'خدمة صيانة')}</span>
                    ${canEdit ? `<button type="button" onclick="openEditServiceModal('${s.id}')" class="absolute top-3 right-12 w-8 h-8 rounded-full bg-white/90 text-sky-600 hover:bg-sky-500 hover:text-white flex items-center justify-center transition" title="${L('Edit service', 'تعديل الخدمة')}"><i class="fa-solid fa-pen text-xs"></i></button><button type="button" onclick="removeService('${s.id}')" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition" title="${L('Remove service', 'حذف الخدمة')}"><i class="fa-solid fa-trash-can text-xs"></i></button>` : ''}
                </div>
                <div class="p-5 space-y-2">
                    <h3 class="font-bold text-base leading-snug">${escapeHtml(tr ? tr.name : s.name)}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">${escapeHtml(tr ? tr.desc : (s.desc || ''))}</p>
                </div>
            </div>
            <div class="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">${t('price_label', 'Price')}</span>
                    <span class="text-lg font-extrabold text-sky-600 dark:text-sky-400">${Number(s.price).toLocaleString()} ${t('egp_symbol', 'EGP')}</span>
                </div>
                <button onclick="bookServiceById('${s.id}')" class="bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition">
                    ${t('btn_book_repair', 'Book Repair')}
                </button>
            </div>
        </div>`;
    }).join('');
}

// ================= CATALOG MANAGER (head admin / admin add products & services) =================
const PRODUCT_PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" fill="#94a3b8" font-family="sans-serif" font-size="28" text-anchor="middle" dominant-baseline="middle">No image</text></svg>');
const CATALOG_INPUT_CLS = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500';
const CATALOG_CARD_CLS = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs shadow-sm';

function orderProductById(id) {
    const p = state.products.find(x => x.id === id);
    if (!p) return;
    if (p.outOfStock) {
        showToast(L('This item is currently Out of Stock.', 'هذا المنتج نفدت كميته حالياً.'), 'error');
        return;
    }
    openOrderCheckout(p.name, p.price, 'Product');
}

function bookServiceById(id) {
    const s = state.services.find(x => x.id === id);
    if (!s) return;
    if (s.id === 's5') {
        openInsuranceModal();
        return;
    }
    const type = s.id === 's5' ? 'Product' : 'Tech Fix Service';
    openOrderCheckout(s.name, s.price, type);
}

function renderCatalogForms() {
    const allowed = canManageAreas();
    const pBox = document.getElementById('adminProductFormBox');
    const sBox = document.getElementById('adminServiceFormBox');

    if (pBox) {
        if (!allowed) pBox.innerHTML = '';
        else if (!pBox.firstElementChild) {
            pBox.innerHTML = `
            <form onsubmit="handleAddProductSubmit(event)" class="${CATALOG_CARD_CLS}">
                <h3 class="font-bold text-sm flex items-center gap-2"><i class="fa-solid fa-plus text-sky-500"></i> ${L('Add New Product', 'إضافة منتج جديد')}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" id="newProductName" required maxlength="80" placeholder="${L('Product name, e.g., Carrier 3 HP Split AC', 'اسم المنتج')}" class="${CATALOG_INPUT_CLS}">
                    <input type="text" id="newProductCategory" list="productCategoryList" required maxlength="40" placeholder="${L('Category, e.g., Split AC', 'الفئة، مثال: تكييف سبليت')}" class="${CATALOG_INPUT_CLS}">
                    <datalist id="productCategoryList"></datalist>
                    <input type="number" id="newProductPrice" required min="1" step="any" placeholder="${L('Price (EGP)', 'السعر (جنيه)')}" class="${CATALOG_INPUT_CLS}">
                    <label class="flex items-center gap-2 ${CATALOG_INPUT_CLS} cursor-pointer font-bold text-red-500"><input type="checkbox" id="newProductOutOfStock" class="accent-red-500"> ${L('Out of Stock', 'نفدت الكمية')}</label>
                    ${imagePickFieldHtml('newProductImage', 'newProductImagePreview', 'previewNewProductImage')}
                    <textarea id="newProductSpecs" rows="2" maxlength="200" placeholder="${L('Short specs / description', 'مواصفات مختصرة / وصف')}" class="md:col-span-2 ${CATALOG_INPUT_CLS}"></textarea>
                </div>
                <button type="submit" class="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-5 py-3 rounded-xl uppercase tracking-wider transition"><i class="fa-solid fa-plus"></i> ${L('Add Product', 'إضافة المنتج')}</button>
            </form>`;
        }
        const dl = document.getElementById('productCategoryList');
        if (dl) dl.innerHTML = [...new Set(state.products.map(p => p.category).filter(Boolean))].map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
    }

    if (sBox) {
        if (!allowed) sBox.innerHTML = '';
        else if (!sBox.firstElementChild) {
            sBox.innerHTML = `
            <form onsubmit="handleAddServiceSubmit(event)" class="${CATALOG_CARD_CLS}">
                <h3 class="font-bold text-sm flex items-center gap-2"><i class="fa-solid fa-plus text-sky-500"></i> ${L('Add New Service', 'إضافة خدمة جديدة')}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input type="text" id="newServiceName" required maxlength="80" placeholder="${L('Service name, e.g., Split AC Deep Cleaning', 'اسم الخدمة')}" class="${CATALOG_INPUT_CLS}">
                    <input type="number" id="newServicePrice" required min="0" step="any" placeholder="${L('Price (EGP)', 'السعر (جنيه)')}" class="${CATALOG_INPUT_CLS}">
                    ${imagePickFieldHtml('newServiceImage', 'newServiceImagePreview', 'previewNewServiceImage')}
                    <textarea id="newServiceDesc" rows="2" maxlength="200" placeholder="${L('Short description', 'وصف مختصر')}" class="md:col-span-2 ${CATALOG_INPUT_CLS}"></textarea>
                </div>
                <button type="submit" class="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-5 py-3 rounded-xl uppercase tracking-wider transition"><i class="fa-solid fa-plus"></i> ${L('Add Service', 'إضافة الخدمة')}</button>
            </form>`;
        }
    }
}

// Holds the compressed data URL picked in the "Add Product" / "Add Service"
// forms, set by the preview handlers below and consumed on submit.
let pendingNewProductImage = null;
let pendingNewServiceImage = null;
const previewNewProductImage = makeImagePickHandler(v => pendingNewProductImage = v, 'newProductImagePreview');
const previewNewServiceImage = makeImagePickHandler(v => pendingNewServiceImage = v, 'newServiceImagePreview');

function handleAddProductSubmit(e) {
    e.preventDefault();
    if (!canManageAreas()) { showToast(L('Only the head admin or an admin can add products.', 'فقط المدير العام أو المشرف يمكنه إضافة منتجات.'), 'error'); return; }
    const clean = v => v.trim().replace(/\s+/g, ' ');
    const name = clean(document.getElementById('newProductName').value);
    const category = clean(document.getElementById('newProductCategory').value);
    const price = Number(document.getElementById('newProductPrice').value);
    const image = pendingNewProductImage || '';
    const specs = clean(document.getElementById('newProductSpecs').value);

    if (!name || !category || !(price > 0)) { showToast(L('Please enter a name, category and a valid price.', 'يرجى إدخال الاسم والفئة وسعر صحيح.'), 'error'); return; }
    if (state.products.some(p => String(p.name).toLowerCase() === name.toLowerCase())) { showToast(L(`"${name}" already exists.`, `"${name}" موجود بالفعل.`), 'error'); return; }

    state.products.push({ id: 'p' + Date.now(), name, category, price, specs, image, outOfStock: !!(document.getElementById('newProductOutOfStock') && document.getElementById('newProductOutOfStock').checked) });
    saveState();
    e.target.reset();
    pendingNewProductImage = null;
    const preview = document.getElementById('newProductImagePreview');
    if (preview) preview.innerHTML = '<i class="fa-solid fa-image"></i>';
    renderProducts();
    showToast(L(`Product "${name}" added.`, `تمت إضافة المنتج "${name}".`), 'success');
}

function handleAddServiceSubmit(e) {
    e.preventDefault();
    if (!canManageAreas()) { showToast(L('Only the head admin or an admin can add services.', 'فقط المدير العام أو المشرف يمكنه إضافة خدمات.'), 'error'); return; }
    const clean = v => v.trim().replace(/\s+/g, ' ');
    const name = clean(document.getElementById('newServiceName').value);
    const price = Number(document.getElementById('newServicePrice').value);
    const desc = clean(document.getElementById('newServiceDesc').value);

    if (!name || !(price >= 0) || document.getElementById('newServicePrice').value === '') { showToast(L('Please enter a name and a valid price.', 'يرجى إدخال الاسم وسعر صحيح.'), 'error'); return; }
    if (state.services.some(s => String(s.name).toLowerCase() === name.toLowerCase())) { showToast(L(`"${name}" already exists.`, `"${name}" موجودة بالفعل.`), 'error'); return; }

    const svcImage = pendingNewServiceImage || '';
    state.services.push({ id: 's' + Date.now(), name, price, desc, image: svcImage });
    saveState();
    e.target.reset();
    pendingNewServiceImage = null;
    const preview = document.getElementById('newServiceImagePreview');
    if (preview) preview.innerHTML = '<i class="fa-solid fa-image"></i>';
    renderTechServices();
    showToast(L(`Service "${name}" added.`, `تمت إضافة الخدمة "${name}".`), 'success');
}

function removeProduct(id) {
    if (!canManageAreas()) return;
    const p = state.products.find(x => x.id === id);
    if (!p || !window.confirm(L(`Remove "${p.name}" from the products?`, `حذف "${p.name}" من المنتجات؟`))) return;
    state.products = state.products.filter(x => x.id !== id);
    saveState();
    renderProducts();
}

function removeService(id) {
    if (!canManageAreas()) return;
    const s = state.services.find(x => x.id === id);
    if (!s || !window.confirm(L(`Remove "${s.name}" from the services?`, `حذف "${s.name}" من الخدمات؟`))) return;
    state.services = state.services.filter(x => x.id !== id);
    saveState();
    renderTechServices();
}

// ================= POLICIES (head admin / admin can edit) =================
let policyEditing = false;

function loadPolicyOverrides() {
    try {
        const stored = JSON.parse(localStorage.getItem('ca_policies'));
        if (stored && typeof stored === 'object') return stored;
    } catch (e) { /* no edits saved yet */ }
    return {};
}

function getPolicyDefaults() {
    return {
        title: t('terms_title'),
        subtitle: t('terms_subtitle'),
        intro: t('terms_intro'),
        fee: t('terms_fee'),
        terms: [1, 2, 3, 4].map(i => t('term_' + i)),
        voidTitle: t('void_warning'),
        voids: [1, 2, 3].map(i => t('void_' + i)),
        notCoveredTitle: t('not_covered_title'),
        notCovered: [1, 2, 3, 4].map(i => t('not_covered_' + i))
    };
}

// Edits are saved per language, so the English and Arabic versions can be edited separately.
function getPolicy() {
    const saved = loadPolicyOverrides()[state.currentLang || 'en'] || {};
    return { ...getPolicyDefaults(), ...saved };
}

function startPolicyEdit() { if (canManageAreas()) { policyEditing = true; renderPolicies(); } }
function cancelPolicyEdit() { policyEditing = false; renderPolicies(); }

function savePolicyEdit() {
    if (!canManageAreas()) return;
    const val = id => document.getElementById(id).value.trim();
    const lines = id => document.getElementById(id).value.split('\n').map(s => s.trim()).filter(Boolean);
    const data = {
        title: val('polTitle'), subtitle: val('polSubtitle'), intro: val('polIntro'), fee: val('polFee'),
        terms: lines('polTerms'), voidTitle: val('polVoidTitle'), voids: lines('polVoids'),
        notCoveredTitle: val('polNotCoveredTitle'), notCovered: lines('polNotCovered')
    };
    if (!data.title) { showToast(L('The policy needs a title.', 'يجب أن يحتوي النص على عنوان.'), 'error'); return; }
    const all = loadPolicyOverrides();
    all[state.currentLang || 'en'] = data;
    localStorage.setItem('ca_policies', JSON.stringify(all));
    policyEditing = false;
    renderPolicies();
    showToast(L('Policy updated.', 'تم تحديث السياسة.'), 'success');
}

function resetPolicyEdit() {
    if (!canManageAreas()) return;
    if (!window.confirm(L('Restore the original policy text?', 'استعادة نص السياسة الأصلي؟'))) return;
    const all = loadPolicyOverrides();
    delete all[state.currentLang || 'en'];
    localStorage.setItem('ca_policies', JSON.stringify(all));
    policyEditing = false;
    renderPolicies();
    showToast(L('Original policy restored.', 'تمت استعادة السياسة الأصلية.'), 'success');
}

function renderPolicies() {
    const box = document.getElementById('policyCard');
    if (!box) return;
    const canEdit = canManageAreas();
    if (!canEdit) policyEditing = false;
    const p = getPolicy();
    const cardCls = 'bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-8 shadow-sm';

    if (policyEditing) {
        const lbl = txt => `<label class="block text-[11px] font-bold uppercase text-slate-500 mb-1">${txt}</label>`;
        const input = (id, v) => `<input type="text" id="${id}" value="${escapeHtml(v)}" class="${CATALOG_INPUT_CLS} text-sm">`;
        const area = (id, v, rows) => `<textarea id="${id}" rows="${rows}" class="${CATALOG_INPUT_CLS} text-sm leading-relaxed">${escapeHtml(v)}</textarea>`;
        const hint = L('one item per line', 'عنصر في كل سطر');
        box.innerHTML = `
        <div class="${cardCls}">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <h3 class="font-extrabold text-lg flex items-center gap-2"><i class="fa-solid fa-pen-to-square text-sky-500"></i> ${L('Edit Policy', 'تعديل السياسة')}</h3>
                <span class="text-[11px] font-bold text-slate-400">${L('Editing the English version — switch language to edit the Arabic one.', 'تعدّل الآن النسخة العربية — غيّر اللغة لتعديل النسخة الإنجليزية.')}</span>
            </div>
            <div class="space-y-4">
                <div>${lbl(L('Title', 'العنوان'))}${input('polTitle', p.title)}</div>
                <div>${lbl(L('Subtitle', 'العنوان الفرعي'))}${input('polSubtitle', p.subtitle)}</div>
                <div>${lbl(L('Intro text', 'النص التمهيدي'))}${area('polIntro', p.intro, 3)}</div>
                <div>${lbl(L('Highlighted fee text', 'نص الرسوم المميز'))}${input('polFee', p.fee)}</div>
                <div>${lbl(L('What the plan covers', 'ما يغطيه البرنامج') + ' — ' + hint)}${area('polTerms', p.terms.join('\n'), 5)}</div>
                <div>${lbl(L('"Void" warning heading', 'عنوان حالات الإلغاء'))}${input('polVoidTitle', p.voidTitle)}</div>
                <div>${lbl(L('Cases where the plan is void', 'حالات إلغاء التأمين') + ' — ' + hint)}${area('polVoids', p.voids.join('\n'), 4)}</div>
                <div>${lbl(L('"Not covered" heading', 'عنوان الأعمال غير المشمولة'))}${input('polNotCoveredTitle', p.notCoveredTitle)}</div>
                <div>${lbl(L('Work not covered', 'الأعمال غير المشمولة') + ' — ' + hint)}${area('polNotCovered', p.notCovered.join('\n'), 5)}</div>
            </div>
            <div class="flex flex-wrap gap-3 text-xs">
                <button type="button" onclick="savePolicyEdit()" class="bg-sky-500 hover:bg-sky-600 text-white font-bold px-5 py-3 rounded-xl uppercase tracking-wider transition">${L('Save Changes', 'حفظ التعديلات')}</button>
                <button type="button" onclick="cancelPolicyEdit()" class="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold px-5 py-3 rounded-xl uppercase tracking-wider transition">${L('Cancel', 'إلغاء')}</button>
                <button type="button" onclick="resetPolicyEdit()" class="ms-auto text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 font-bold px-4 py-3 rounded-xl transition">${L('Restore original', 'استعادة الأصل')}</button>
            </div>
        </div>`;
        return;
    }

    const list = (items, cls, tag = 'ul', listCls = 'list-disc') => `
        <${tag} class="text-sm sm:text-base ${cls} leading-relaxed space-y-2.5 ${listCls} pr-5 rtl:pr-0 rtl:pl-5 pl-5">
            ${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
        </${tag}>`;

    box.innerHTML = `
    <div class="${cardCls}">
        <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-500 flex items-center justify-center font-extrabold text-xl shrink-0">
                <i class="fa-solid fa-clipboard-check"></i>
            </div>
            <div class="flex-1 min-w-0">
                <h3 class="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">${escapeHtml(p.title)}</h3>
                <p class="text-xs sm:text-sm font-semibold text-slate-400 mt-0.5">${escapeHtml(p.subtitle)}</p>
            </div>
            ${canEdit ? `<button type="button" onclick="startPolicyEdit()" class="shrink-0 inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition"><i class="fa-solid fa-pen"></i> ${L('Edit', 'تعديل')}</button>` : ''}
        </div>

        <div class="space-y-3">
            <p class="text-sm sm:text-base text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">${escapeHtml(p.intro)}<strong class="text-sky-600 dark:text-sky-400 font-extrabold">${escapeHtml(p.fee)}</strong>.</p>
            ${list(p.terms, 'text-slate-600 dark:text-slate-300 font-medium')}
        </div>

        <div class="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-6 space-y-4">
            <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500 text-white text-xs font-extrabold uppercase tracking-wide">
                <i class="fa-solid fa-triangle-exclamation"></i> <span>${escapeHtml(t('please_note'))}</span>
            </span>
            <p class="text-sm sm:text-base font-extrabold text-red-700 dark:text-red-400">${escapeHtml(p.voidTitle)}</p>
            ${list(p.voids, 'font-semibold text-red-600 dark:text-red-300', 'ol', 'list-decimal')}
        </div>

        <div class="space-y-3">
            <p class="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100">${escapeHtml(p.notCoveredTitle)}</p>
            ${list(p.notCovered, 'font-medium text-slate-600 dark:text-slate-300')}
        </div>

        <p class="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
            <span>${escapeHtml(t('auth_center_note'))}</span><a href="javascript:void(0)" onclick="navigateTo('contact')" class="text-sky-500 font-extrabold hover:underline">${escapeHtml(t('nav_contact'))}</a> <span>${escapeHtml(t('or_call_report'))}</span>
        </p>
    </div>`;
}

function clearCheckoutErrors() {
    const txErr = document.getElementById('orderTxRefError');
    if (txErr) txErr.classList.add('hidden');
    const unitErr = document.getElementById('orderRepairUnitError');
    if (unitErr) unitErr.classList.add('hidden');
    const insErr = document.getElementById('insuranceTxRefError');
    if (insErr) insErr.classList.add('hidden');
    const serialErr = document.getElementById('insuranceUnitRefError');
    if (serialErr) serialErr.classList.add('hidden');
}

let pendingCheckoutOrder = null;

function openOrderCheckout(title, price, type) {
    if (!state.currentUser) {
        showToast(state.currentLang === 'ar' ? 'يرجى تسجيل الدخول أولاً!' : 'Please login to place an order!', 'error');
        openAuthModal();
        return;
    }

    const isRepair = type === 'Tech Fix Service';
    pendingCheckoutOrder = { title, price, type, isRepair };

    clearCheckoutErrors();

    const modal = document.getElementById('orderCheckoutModal');
    const titleBox = document.getElementById('orderCheckoutTitle');
    const subtitleBox = document.getElementById('orderCheckoutSubtitle');
    const itemBox = document.getElementById('orderCheckoutItem');
    const amountBox = document.getElementById('orderCheckoutAmount');
    const gatewaySection = document.getElementById('orderGatewaySection');
    const instapayDetails = document.getElementById('orderInstapayDetails');
    const vodafoneDetails = document.getElementById('orderVodafoneDetails');
    const txRefSection = document.getElementById('orderTxRefSection');
    const txRefInput = document.getElementById('orderCheckoutTxRef');
    const repairUnitSection = document.getElementById('orderRepairUnitSection');
    const repairUnitInput = document.getElementById('orderCheckoutUnit');
    const locationSelect = document.getElementById('orderCheckoutLocation');
    const submitBtn = document.getElementById('orderCheckoutSubmitBtn');
    const form = document.getElementById('orderCheckoutForm');

    // Repair bookings: only the real service areas (no "Other Area").
    // Product orders: service areas + "Other Area" (customer types their own place).
    if (locationSelect) locationSelect.innerHTML = getLocationOptionsHtml('', !isRepair);
    if (form) form.reset();
    resetLocationShareUi();
    if (itemBox) itemBox.innerText = title;

    if (isRepair) {
        // FOR REPAIRS: NO price, NO payment gateways, NO sender phone
        // ONLY Location + Unit to be checked
        if (titleBox) titleBox.innerText = t('complete_repair_title', 'Book Repair Inspection');
        if (subtitleBox) subtitleBox.innerText = t('repair_checkout_subtitle', 'Select your location and the AC unit you would like checked by our technician.');
        if (amountBox) amountBox.classList.add('hidden');
        if (gatewaySection) gatewaySection.classList.add('hidden');
        if (instapayDetails) instapayDetails.classList.add('hidden');
        if (vodafoneDetails) vodafoneDetails.classList.add('hidden');
        if (txRefSection) txRefSection.classList.add('hidden');
        if (txRefInput) txRefInput.removeAttribute('required');

        if (repairUnitSection) repairUnitSection.classList.remove('hidden');
        if (repairUnitInput) {
            repairUnitInput.setAttribute('required', 'required');
            repairUnitInput.value = '';
        }
        if (submitBtn) submitBtn.innerText = t('btn_confirm_repair', 'Confirm Repair Booking');
    } else {
        // FOR PRODUCT ORDERS: Price, Payment gateways, Sender phone / reference, Location
        if (titleBox) titleBox.innerText = t('complete_order_title', 'Complete Order');
        if (subtitleBox) subtitleBox.innerText = t('checkout_subtitle', 'Choose a payment method and complete the request details below.');
        if (amountBox) {
            amountBox.classList.remove('hidden');
            amountBox.innerText = `${price.toLocaleString()} ${t('egp_symbol', 'EGP')}`;
        }
        if (gatewaySection) gatewaySection.classList.remove('hidden');
        if (txRefSection) txRefSection.classList.remove('hidden');
        if (txRefInput) txRefInput.setAttribute('required', 'required');

        if (repairUnitSection) repairUnitSection.classList.add('hidden');
        if (repairUnitInput) repairUnitInput.removeAttribute('required');

        toggleOrderGatewayDetails('instapay');
        if (submitBtn) submitBtn.innerText = t('btn_confirm_order', 'Confirm Order');
    }

    modal.classList.remove('hidden');
}

// ---------- Customer location sharing (GPS) + "Other Area" text box ----------
let pendingCheckoutCoords = null;

function setLocationStatus(kind, html) {
    const box = document.getElementById('orderLocationStatus');
    if (!box) return;
    const colors = {
        idle: 'text-slate-400',
        loading: 'text-sky-500',
        ok: 'text-emerald-600 dark:text-emerald-400 font-bold',
        error: 'text-red-500 font-bold'
    };
    box.className = `text-[11px] mt-0.5 ${colors[kind] || colors.idle}`;
    box.innerHTML = html;
}

function resetLocationShareUi() {
    pendingCheckoutCoords = null;
    const btn = document.getElementById('orderShareLocationBtn');
    const btnText = document.getElementById('orderShareLocationBtnText');
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = t('btn_share_location', 'Share my location');
    setLocationStatus('idle', escapeHtml(t('share_location_hint', 'Tap the button to send us your exact GPS position.')));

    const otherSection = document.getElementById('orderOtherAreaSection');
    const otherInput = document.getElementById('orderCheckoutOtherArea');
    if (otherSection) otherSection.classList.add('hidden');
    if (otherInput) otherInput.value = '';
    const addressInput = document.getElementById('orderCheckoutAddress');
    if (addressInput) addressInput.value = '';
}

// Shows the "write your place" box only when a product order picks "Other Area".
function handleOrderLocationChange() {
    const select = document.getElementById('orderCheckoutLocation');
    const section = document.getElementById('orderOtherAreaSection');
    const input = document.getElementById('orderCheckoutOtherArea');
    if (!select || !section) return;
    const isOther = select.value === OTHER_AREA;
    section.classList.toggle('hidden', !isOther);
    if (!isOther && input) input.value = '';
    if (isOther && input) input.focus();
}

function shareCustomerLocation() {
    const btn = document.getElementById('orderShareLocationBtn');
    const btnText = document.getElementById('orderShareLocationBtnText');

    if (!navigator.geolocation) {
        setLocationStatus('error', escapeHtml(L('Your browser does not support location sharing.', 'متصفحك لا يدعم مشاركة الموقع.')));
        return;
    }
    if (window.isSecureContext === false) {
        setLocationStatus('error', escapeHtml(L('Location sharing needs a secure (https) connection.', 'مشاركة الموقع تتطلب اتصالاً آمناً (https).')));
        return;
    }

    if (btn) btn.disabled = true;
    setLocationStatus('loading', escapeHtml(L('Getting your location… please allow access when your browser asks.', 'جاري تحديد موقعك… يرجى السماح بالوصول عندما يطلب المتصفح ذلك.')));

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            pendingCheckoutCoords = {
                lat: Number(pos.coords.latitude.toFixed(6)),
                lng: Number(pos.coords.longitude.toFixed(6)),
                accuracy: Math.round(pos.coords.accuracy || 0),
                capturedAt: new Date().toISOString()
            };
            if (btn) btn.disabled = false;
            if (btnText) btnText.textContent = t('btn_update_location', 'Update location');
            setLocationStatus('ok',
                `<i class="fa-solid fa-circle-check me-1"></i>${escapeHtml(L('Location captured', 'تم تحديد الموقع'))}` +
                (pendingCheckoutCoords.accuracy ? ` (±${pendingCheckoutCoords.accuracy} ${escapeHtml(L('m', 'م'))})` : '') +
                ` — <a href="${buildMapsUrl(pendingCheckoutCoords)}" target="_blank" rel="noopener noreferrer" class="underline">${escapeHtml(L('preview on map', 'معاينة على الخريطة'))}</a>`);
        },
        (err) => {
            pendingCheckoutCoords = null;
            if (btn) btn.disabled = false;
            let msg;
            if (err && err.code === 1) {
                msg = L('Location access was blocked. Please allow location for this site in your browser settings, then tap the button again.',
                    'تم حظر الوصول إلى الموقع. يرجى السماح بالموقع لهذا الموقع من إعدادات المتصفح ثم اضغط الزر مرة أخرى.');
            } else if (err && err.code === 3) {
                msg = L('Getting your location took too long. Please try again.', 'استغرق تحديد موقعك وقتاً طويلاً. يرجى المحاولة مرة أخرى.');
            } else {
                msg = L('Could not determine your location. Please check that GPS is on and try again.', 'تعذر تحديد موقعك. يرجى التأكد من تشغيل GPS والمحاولة مرة أخرى.');
            }
            setLocationStatus('error', escapeHtml(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
}

function closeOrderCheckoutModal() {
    pendingCheckoutOrder = null;
    clearCheckoutErrors();
    resetLocationShareUi();
    const form = document.getElementById('orderCheckoutForm');
    if (form) form.reset();
    document.getElementById('orderCheckoutModal').classList.add('hidden');
}

function toggleOrderGatewayDetails(gw) {
    const insta = document.getElementById('orderInstapayDetails');
    const voda = document.getElementById('orderVodafoneDetails');
    const labelInsta = document.getElementById('orderLabelInstapay');
    const labelVoda = document.getElementById('orderLabelVodafone');

    const activeClasses = ['border-2', 'border-sky-500', 'bg-sky-50/50', 'dark:bg-sky-950/40'];
    const inactiveClasses = ['border', 'border-slate-200', 'dark:border-slate-700'];

    if (gw === 'instapay') {
        if (insta) insta.classList.remove('hidden');
        if (voda) voda.classList.add('hidden');
        if (labelInsta) {
            labelInsta.classList.add(...activeClasses);
            labelInsta.classList.remove(...inactiveClasses);
        }
        if (labelVoda) {
            labelVoda.classList.remove(...activeClasses);
            labelVoda.classList.add(...inactiveClasses);
        }
    } else {
        if (voda) voda.classList.remove('hidden');
        if (insta) insta.classList.add('hidden');
        if (labelVoda) {
            labelVoda.classList.add(...activeClasses);
            labelVoda.classList.remove(...inactiveClasses);
        }
        if (labelInsta) {
            labelInsta.classList.remove(...activeClasses);
            labelInsta.classList.add(...inactiveClasses);
        }
    }
}

function submitOrderCheckout(e) {
    e.preventDefault();
    clearCheckoutErrors();

    if (!pendingCheckoutOrder) {
        closeOrderCheckoutModal();
        return;
    }

    const isRepair = pendingCheckoutOrder.type === 'Tech Fix Service';
    let location = document.getElementById('orderCheckoutLocation').value;

    if (!location) {
        showToast(state.currentLang === 'ar' ? 'يرجى اختيار الموقع.' : 'Please choose a location.', 'error');
        return;
    }

    // Product orders only: "Other Area" means the customer writes their own place.
    if (!isRepair && location === OTHER_AREA) {
        const otherInput = document.getElementById('orderCheckoutOtherArea');
        const otherVal = otherInput ? otherInput.value.trim().replace(/\s+/g, ' ') : '';
        if (otherVal.length < 3) {
            showToast(L('Please write your area / address.', 'يرجى كتابة منطقتك / عنوانك.'), 'error');
            if (otherInput) otherInput.focus();
            return;
        }
        location = `${OTHER_AREA}: ${otherVal}`;
    }

    // Location: either a shared GPS pin OR a typed address is accepted
    // (switch REQUIRE_LOCATION_SHARE to false to skip both entirely).
    const addressInput = document.getElementById('orderCheckoutAddress');
    const addressVal = addressInput ? addressInput.value.trim().replace(/\s+/g, ' ') : '';
    if (REQUIRE_LOCATION_SHARE && !pendingCheckoutCoords && addressVal.length < 5) {
        setLocationStatus('error', escapeHtml(L('Please share your location or type your address below.', 'يرجى مشاركة موقعك أو كتابة عنوانك بالأسفل.')));
        showToast(L('Please share your location or type your address.', 'يرجى مشاركة موقعك أو كتابة عنوانك.'), 'error');
        if (addressInput) addressInput.focus();
        return;
    }

    let itemTitle = pendingCheckoutOrder.title;
    let gateway = 'N/A';
    let amount = pendingCheckoutOrder.price || 0;

    if (isRepair) {
        // Booking repairs: Validate Unit to be checked
        const unitInput = document.getElementById('orderCheckoutUnit');
        const unitVal = unitInput ? unitInput.value.trim() : '';
        if (!unitVal) {
            const unitErr = document.getElementById('orderRepairUnitError');
            const unitErrText = document.getElementById('orderRepairUnitErrorText');
            if (unitErr && unitErrText) {
                unitErrText.innerText = state.currentLang === 'ar'
                    ? 'يرجى إدخال بيانات أو نوع الوحدة المطلوب فحصها.'
                    : 'Please specify the AC unit to be checked.';
                unitErr.classList.remove('hidden');
            }
            if (unitInput) unitInput.focus();
            return;
        }

        itemTitle = `${pendingCheckoutOrder.title} (${unitVal})`;
        gateway = state.currentLang === 'ar' ? 'فحص ميداني (الدفع للفني: نقدي / انستا باي / فودافون كاش)' : 'On-Site Inspection / Pay Technician (Cash / InstaPay / Vodafone Cash)';
        amount = 0; // No price charged upfront for repair booking
    } else {
        // Product orders: Validate transaction reference / sender phone
        const txInput = document.getElementById('orderCheckoutTxRef');
        const txRef = txInput ? txInput.value.trim() : '';
        const selectedGwEl = document.querySelector('input[name="orderGateway"]:checked');
        const selectedGw = selectedGwEl ? selectedGwEl.value : 'InstaPay';

        if (!txRef) {
            const txErr = document.getElementById('orderTxRefError');
            const txErrText = document.getElementById('orderTxRefErrorText');
            if (txErr && txErrText) {
                txErrText.innerText = state.currentLang === 'ar'
                    ? 'يرجى إدخال رقم العملية أو رقم هاتف الراسل.'
                    : 'Please enter transaction reference or sender phone.';
                txErr.classList.remove('hidden');
            }
            if (txInput) txInput.focus();
            return;
        }

        // Sender phone validation: exactly 11 digits
        const cleanRef = txRef.replace(/\s+/g, '');
        const isPhoneLike = /^\d+$/.test(cleanRef) || cleanRef.startsWith('01');
        if (selectedGw === 'Vodafone Cash' || isPhoneLike) {
            if (!/^\d{11}$/.test(cleanRef)) {
                const txErr = document.getElementById('orderTxRefError');
                const txErrText = document.getElementById('orderTxRefErrorText');
                if (txErr && txErrText) {
                    txErrText.innerText = state.currentLang === 'ar'
                        ? 'يجب أن يتكون رقم هاتف الراسل من 11 رقماً بالضبط (مثال: 01012345678).'
                        : 'Sender phone number must be exactly 11 digits (e.g. 01012345678).';
                    txErr.classList.remove('hidden');
                }
                if (txInput) txInput.focus();
                return;
            }
        }

        gateway = `${selectedGw} (Ref: ${txRef})`;
    }

    const newOrder = {
        id: createDateBasedId(isRepair ? 'REP' : 'ORD'),
        date: getLocalDateString(),
        userId: getCurrentUserId(),
        username: state.currentUser.username,
        customerName: state.currentUser.name || state.currentUser.username,
        customerWhatsApp: state.currentUser.whatsapp || '',
        customerContactPhone: state.currentUser.contactPhone || '',
        location: location,
        locationCoords: pendingCheckoutCoords ? { ...pendingCheckoutCoords } : null,
        customerAddress: addressVal || null,
        createdAt: new Date().toISOString(),
        itemTitle: itemTitle,
        amount: amount,
        type: pendingCheckoutOrder.type,
        insurancePaid: isRepair ? 'N/A' : 'Optional',
        gateway: gateway,
        status: isRepair ? 'Inspection Requested' : 'Pending Dispatch'
    };

    state.orders.unshift(newOrder);
    saveState();

    // Silent background admin notification — NO pop-up notification toast shown here
    notifyAdminAboutOrder(newOrder);

    // Auto-create task on Task Board
    createTaskFromOrder(newOrder);

    closeOrderCheckoutModal();

    // Show single user-facing confirmation toast
    if (isRepair) {
        showToast(state.currentLang === 'ar'
            ? `تم حجز فحص الصيانة بنجاح!`
            : `Repair inspection booked successfully!`, 'success');
    } else {
        showToast(state.currentLang === 'ar'
            ? `تم تسجيل طلب "${newOrder.itemTitle}" بنجاح!`
            : `Order for "${newOrder.itemTitle}" confirmed!`, 'success');
    }

    refreshCurrentView();
}

// Auto-generates a task from a customer order (unit purchase or repair
// booking) so it appears on the Task Board unassigned, ready for a head
// admin/Customer Services to dispatch to a technician. Linked back to the order via orderId.
function createTaskFromOrder(order) {
    const isRepair = order.type === 'Tech Fix Service';

    const task = {
        id: createDateBasedId('TSK'),
        title: `${isRepair ? 'Repair Request' : 'New Unit Order'}: ${order.itemTitle}`,
        // Deliberately no phone/WhatsApp number here — technicians get every
        // other detail about the job, but the client's number stays with
        // admin/Customer Services only (visible in the Orders table & confirmation email).
        description: `Customer @${order.username} (${order.customerName}) — Location: ${order.location || 'N/A'}. Order Ref: ${order.id}.`,
        assignedTo: '',
        createdBy: 'System (Auto from Order)',
        createdDate: getLocalDateString(),
        createdAt: new Date().toISOString(),
        dueDate: '',
        priority: isRepair ? 'High' : 'Normal',
        status: 'Open',
        orderId: order.id,
        orderType: order.type,
        phase: isRepair ? 'repair' : 'unit',
        locationCoords: order.locationCoords || null
    };

    state.tasks.unshift(task);
    saveState();
}

// Looks up the task auto-created for a given order, if any, so the Orders
// table can show whether a technician has been assigned yet.
function getLinkedTaskForOrder(orderId) {
    return state.tasks.find(t => t.orderId === orderId);
}

function renderOrderTaskBadge(orderId) {
    const task = getLinkedTaskForOrder(orderId);
    if (!task) return '';
    const phase = getTaskPhase(task);
    // Skip the phase line once the job is Done — the phase it finished on is
    // no longer live info, and repeating it under the Done line just added
    // clutter to an already busy cell.
    const phaseLine = (phase !== 'unit' && task.status !== 'Done')
        ? `<span class="block mt-1 text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide"><i class="fa-solid fa-diagram-next"></i> ${escapeHtml(getPhaseLabel(phase))}</span>`
        : '';
    if (task.status === 'Done') {
        const at = task.completedAt || task.completedDate;
        const canReturn = state.currentUser && (isTopAdmin(state.currentUser.role) || state.currentUser.role === 'hr');
        const technicianUsers = state.users.filter(u => u.role === 'technician');
        // One control: pick which technician it goes back to (defaults to
        // whoever did it), then Return — replaces the old plain "Return to
        // technician" button, which could only send it back to the same person.
        const returnBlock = canReturn
            ? `<div class="mt-1.5 flex items-center gap-1">
                    <select id="return-tech-${task.id}" title="${escapeHtml(L('Reassign to', 'إعادة تعيين إلى'))}"
                        class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-[9px] font-bold max-w-[110px]">
                        ${technicianUsers.map(tech => `<option value="${tech.username}" ${tech.username === task.assignedTo ? 'selected' : ''}>@${tech.username}</option>`).join('')}
                    </select>
                    <button type="button" onclick="returnTaskToTechnician('${task.id}', document.getElementById('return-tech-${task.id}').value)"
                        title="${escapeHtml(t('return_to_technician', 'Return to technician'))}"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 text-[9px] font-extrabold uppercase tracking-wide hover:bg-amber-200 dark:hover:bg-amber-900 transition">
                        <i class="fa-solid fa-rotate-left"></i> ${L('Return', 'إعادة')}
                    </button>
                </div>`
            : '';
        return `<span class="block text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide"><i class="fa-solid fa-circle-check"></i> ${L('Done', 'منجز')}${task.assignedTo ? ` — @${task.assignedTo}` : ''}${at ? ` · ${escapeHtml(formatDateTime(at))}` : ''}</span>${renderRepairPhotosIcon(task, true)}${returnBlock}`;
    }
    if (isTaskLate(task)) {
        return `${phaseLine}<span class="block mt-1 text-[9px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wide"><i class="fa-solid fa-triangle-exclamation"></i> ${L('Late', 'متأخر')} — ${L('Needs Technician', 'بحاجة لفني')}</span>`;
    }
    if (isTaskUnassigned(task)) {
        return `${phaseLine}<span class="block mt-1 text-[9px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wide"><i class="fa-solid fa-hourglass-half"></i> Needs Technician</span>`;
    }
    return `${phaseLine}<span class="block mt-1 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide"><i class="fa-solid fa-check"></i> @${task.assignedTo}</span>`;
}

// Sends a finished (Done) task back to Open so it can be worked again, from
// the Global Orders list. newAssignee lets the admin/CS pick a different
// technician right here instead of always returning to whoever finished it;
// if omitted (or invalid) it falls back to the technician already on the task.
// The completion record is cleared and the linked order goes back to the
// matching live status.
function returnTaskToTechnician(taskId, newAssignee) {
    const canManage = state.currentUser && (isTopAdmin(state.currentUser.role) || state.currentUser.role === 'hr');
    if (!canManage) {
        showToast(L('Only the head admin or Customer Services can return tasks.', 'المسؤول الرئيسي أو خدمة العملاء فقط يمكنهم إعادة المهام.'), 'error');
        return;
    }
    state.tasks = JSON.parse(localStorage.getItem('ca_tasks')) || state.tasks;
    state.orders = JSON.parse(localStorage.getItem('ca_orders')) || state.orders;
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || task.status !== 'Done') return;

    const validTech = newAssignee && state.users.some(u => u.username === newAssignee && u.role === 'technician');
    if (validTech) task.assignedTo = newAssignee;

    task.status = 'Open';
    task.completedAt = null;
    task.completedDate = null;
    task.handedOff = false;
    task.handedOffTo = null;
    task.assignedAt = new Date().toISOString(); // restart the 4-hour "late" clock

    const order = task.orderId ? state.orders.find(o => o.id === task.orderId) : null;
    if (order) {
        order.status = getOrderStatusForTask(task, 'Open');
        delete order.completedAt;
    }
    saveState();
    showToast(L(`Task sent back to @${task.assignedTo || '—'} for reassignment.`, `أُعيدت المهمة إلى @${task.assignedTo || '—'} لإعادة التنفيذ.`), 'success');
    renderAdminDashboard();
}

function placeOrder(title, price, type) {
    openOrderCheckout(title, price, type);
}

// ================= WHO ARE WE - TEAM PROFILES =================
// Every staff account is shown as a full mini-profile: a big photo first,
// then the name, job title and a short description with the account details.
function renderWhoWeAreDetails() {
    const headBox = document.getElementById('whoWeAreHead');
    const techList = document.getElementById('whoWeAreTechList');
    const hrList = document.getElementById('whoWeAreHrList');
    if (!headBox || !techList || !hrList) return;

    const heads = state.users.filter(u => u.role === 'head-admin');
    const executives = state.users.filter(u => u.role === 'executive');
    const technicians = state.users.filter(u => u.role === 'technician');
    const hrTeam = state.users.filter(u => u.role === 'hr');

    const bigAvatar = (u, boxCls, iconCls) => `
        <div class="${boxCls} flex items-center justify-center shrink-0 overflow-hidden">
            ${u.photo
            ? `<img src="${u.photo}" class="w-full h-full object-cover" alt="${escapeHtml(u.name || u.username)}">`
            : `<i class="fa-solid fa-user ${iconCls}"></i>`}
        </div>`;

    // Head admin — full-width highlighted profile with a big photo and a description
    const headHtml = heads.length === 0 ? '' : `
        <div class="bg-gradient-to-br from-sky-900 to-slate-900 text-white rounded-3xl border border-sky-800 p-6 sm:p-8 shadow-sm">
            ${heads.map(u => `
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-start">
                ${bigAvatar(u, 'w-28 h-28 rounded-3xl bg-white/10 border border-white/20 text-white/60', 'text-5xl')}
                <div class="space-y-2 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                        <span class="text-xl font-extrabold">${escapeHtml(u.name || u.username)}</span>
                        <span class="bg-sky-500 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase">${t('head_badge', 'Head')}</span>
                    </div>
                    <p class="text-xs text-sky-200 font-bold">${getRoleLabel('head-admin')}</p>
                    ${renderStaffRating(u.username)}
                </div>
            </div>`).join('')}
        </div>
    `;

    // Executive Director — works alongside the head admin, shown right under the Admin card
    const execHtml = executives.length === 0 ? '' : `
        <div class="mt-4 bg-white dark:bg-slate-900 rounded-3xl border border-sky-200 dark:border-sky-900 p-5 sm:p-6 shadow-sm space-y-5">
            ${executives.map(u => `
            <div class="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-start">
                ${bigAvatar(u, 'w-24 h-24 rounded-3xl bg-sky-50 dark:bg-sky-950 text-sky-500', 'text-4xl')}
                <div class="space-y-2 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                        <span class="text-lg font-extrabold">${escapeHtml(u.name || u.username)}</span>
                        <span class="bg-sky-500 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase">${escapeHtml(getRoleLabel('executive'))}</span>
                    </div>
                    ${renderStaffRating(u.username)}
                </div>
            </div>`).join('')}
        </div>
    `;
    headBox.innerHTML = headHtml + execHtml;

    // Technicians & Customer Services — big photo first, then name / job / description
    const renderMiniList = (users, roleLabel, ratingFn) => {
        if (users.length === 0) {
            return `<p class="text-xs text-slate-400 text-center p-6">No accounts registered yet.</p>`;
        }
        return `
            <ul class="divide-y divide-slate-100 dark:divide-slate-800">
                ${users.map(u => `
                    <li class="p-5 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        ${bigAvatar(u, 'w-20 h-20 rounded-2xl bg-sky-50 dark:bg-sky-950 text-sky-500', 'text-3xl')}
                        <div class="min-w-0 space-y-1">
                            <span class="text-sm font-bold block">${escapeHtml(u.name || u.username)}</span>
                            <span class="text-[10px] text-sky-600 dark:text-sky-400 uppercase font-extrabold">${escapeHtml(getPositionLabel(u))}</span>
                            ${ratingFn(u.username)}
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
    };

    // Technicians are rated per finished job (renderStaffRating); Customer
    // Services are rated per finished chat (renderCsRating) — see the star
    // prompt shown to the customer once a CS conversation ends.
    techList.innerHTML = renderMiniList(technicians, getRoleLabel('technician'), renderStaffRating);
    hrList.innerHTML = renderMiniList(hrTeam, getRoleLabel('hr'), renderCsRating);
}

// Average star rating a Customer Services agent has received from customers
// after their chats — pulled from ca_cs_chats rather than orders/tasks, since
// a CS conversation isn't tied to a purchase or repair job.
function renderCsRating(username) {
    const rated = loadCsChats().filter(c => c.assignedTo === username && c.customerRating && typeof c.customerRating.rating === 'number');
    if (!rated.length) {
        return `<p class="text-[10px] text-slate-400 italic pt-0.5">${L('No ratings yet', 'لا توجد تقييمات بعد')}</p>`;
    }
    const avg = rated.reduce((s, c) => s + c.customerRating.rating, 0) / rated.length;
    return `<div class="flex items-center gap-1.5 pt-0.5">${renderStarRow(avg, 'text-xs')}<span class="text-[10px] text-slate-400 font-bold">${avg.toFixed(1)} (${rated.length})</span></div>`;
}

// ================= RATINGS & VIDEOS PAGE (own nav item, separate from About) =================
function renderReviewsPage() {
    renderAboutRatings();
    renderAboutVideos();
}

// Every rating customers have left, newest first.
function getAllRatings() {
    state.orders = JSON.parse(localStorage.getItem('ca_orders')) || state.orders;
    return state.orders
        .filter(o => o.customerFeedback && !o.customerFeedback.hidden && typeof o.customerFeedback.rating === 'number')
        .map(o => ({
            orderId: o.id,
            rating: o.customerFeedback.rating,
            message: o.customerFeedback.message || '',
            name: String(o.customerName || o.username || '').trim().split(/\s+/)[0],
            date: o.customerFeedback.submittedAt || o.customerFeedback.submittedDate
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderAboutRatings() {
    const box = document.getElementById('aboutRatings');
    if (!box) return;

    const ratings = getAllRatings();
    const count = ratings.length;
    const average = count ? ratings.reduce((sum, r) => sum + r.rating, 0) / count : 0;

    const header = `
        <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-500 flex items-center justify-center font-extrabold text-xl shrink-0">
                <i class="fa-solid fa-star"></i>
            </div>
            <div>
                <h3 class="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">${L('Customer Ratings', 'تقييمات العملاء')}</h3>
                <p class="text-xs sm:text-sm font-semibold text-slate-400 mt-0.5">${L('What our customers say after a completed job', 'ماذا يقول عملاؤنا بعد إتمام الخدمة')}</p>
            </div>
        </div>
    `;

    let body;
    if (count === 0) {
        body = `<p class="text-xs text-slate-400 text-center py-6">${L('No ratings yet — customers can rate a finished job from their dashboard.', 'لا توجد تقييمات بعد — يمكن للعملاء تقييم الخدمة بعد إنجازها من لوحتهم.')}</p>`;
    } else {
        const distribution = [5, 4, 3, 2, 1, 0].map(star => {
            const n = ratings.filter(r => r.rating === star).length;
            const pct = Math.round((n / count) * 100);
            return `
                <div class="flex items-center gap-3 text-xs">
                    <span class="w-8 font-bold text-slate-500 shrink-0">${star} <i class="fa-solid fa-star text-amber-400 text-[10px]"></i></span>
                    <div class="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div class="h-full bg-amber-400 rounded-full" style="width:${pct}%"></div></div>
                    <span class="w-8 text-end text-slate-400 font-mono shrink-0">${n}</span>
                </div>`;
        }).join('');

        const canModerate = canEditAbout();
        const reviews = ratings.map(r => `
            <div class="p-4 space-y-1.5">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                    <div class="flex items-center gap-2">
                        ${renderStarRow(r.rating, 'text-xs')}
                        <span class="text-xs font-bold">${escapeHtml(r.name || L('Customer', 'عميل'))}</span>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                        <span class="text-[10px] text-slate-400">${escapeHtml(formatDateTime(r.date))}</span>
                        ${canModerate ? `<button onclick="removeRating('${r.orderId}')" class="text-xs text-red-500 hover:text-red-600" title="${L('Delete rating', 'حذف التقييم')}"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </div>
                </div>
                ${r.message ? `<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">${escapeHtml(r.message)}</p>` : ''}
            </div>
        `).join('');

        body = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div class="text-center space-y-1">
                    <div class="text-5xl font-extrabold text-slate-900 dark:text-white">${average.toFixed(1)}<span class="text-lg text-slate-400"> / 5</span></div>
                    <div>${renderStarRow(average, 'text-lg')}</div>
                    <p class="text-xs text-slate-400 font-semibold">${L(`Based on ${count} rating${count === 1 ? '' : 's'}`, `بناءً على ${count} تقييم`)}</p>
                </div>
                <div class="md:col-span-2 space-y-2">${distribution}</div>
            </div>
            <div class="rounded-2xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto custom-scrollbar">${reviews}</div>
        `;
    }

    box.innerHTML = `
        <div class="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
            ${header}
            ${body}
        </div>
    `;
}

// Same people who manage service areas (head admin / admin) can edit the videos.
function canEditAbout() {
    return canManageAreas();
}

// Lets the head admin / admin remove a bad/abusive rating from the public Ratings page.
// This clears the feedback off the underlying order — the order itself is kept.
function removeRating(orderId) {
    if (!canEditAbout()) {
        showToast(L('Only admins can moderate ratings.', 'التقييمات متاحة للتعديل من المسؤولين فقط.'), 'error');
        return;
    }
    if (!confirm(L('Delete this rating? This cannot be undone.', 'حذف هذا التقييم؟ لا يمكن التراجع عن هذا الإجراء.'))) return;

    state.orders = JSON.parse(localStorage.getItem('ca_orders')) || state.orders;
    const order = state.orders.find(o => o.id === orderId);
    if (order && order.customerFeedback) {
        // Soft delete: hidden from the public Ratings page, kept on the order
        // so it still shows (with a "Removed" badge) in the admin dashboard records.
        order.customerFeedback.hidden = true;
        order.customerFeedback.hiddenAt = new Date().toISOString();
    }
    saveState();
    showToast(L('Rating hidden from the public page — kept in admin records.', 'تم إخفاء التقييم من الصفحة العامة — وبقي محفوظاً في سجلات الإدارة.'), 'success');
    renderAboutRatings();
}

// Turns a pasted link into something we can embed. Returns null if we don't support it.
function getVideoEmbed(url) {
    const u = String(url || '').trim();
    let m = u.match(/(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return { kind: 'iframe', platform: 'youtube', videoId: m[1], watchUrl: `https://www.youtube.com/watch?v=${m[1]}`, src: `https://www.youtube-nocookie.com/embed/${m[1]}` };
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return { kind: 'iframe', platform: 'vimeo', src: `https://player.vimeo.com/video/${m[1]}` };
    m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (m) return { kind: 'iframe', platform: 'drive', src: `https://drive.google.com/file/d/${m[1]}/preview` };
    if (/^https?:\/\/\S+\.(mp4|webm|ogg)(\?\S*)?$/i.test(u)) return { kind: 'file', platform: 'file', src: u };
    if (/^data:video\//i.test(u)) return { kind: 'file', platform: 'file', src: u };
    return null;
}

// YouTube shows its own "Video player configuration error / Error 153" page inside our
// iframe when the video owner has disabled embedding — we can't catch that from our page
// (it's a cross-origin iframe), so instead we ask YouTube's oEmbed endpoint up front
// whether the video is embeddable, and only mount the iframe if it is. Otherwise we show
// our own "Watch on YouTube" card instead of letting YouTube's broken player show through.
// Click-to-play YouTube facade: shows the video thumbnail with a play button and
// only mounts the real iframe AFTER the visitor taps it. Creating the iframe on a
// user gesture (instead of auto-loading it) is what prevents YouTube's
// "Video player configuration error" (Error 153) from ever appearing inside our
// page — the error only occurs when an embed that isn't allowed to play loads by itself.
function youtubeFacadeCardHtml(v, embed) {
    const safeUrl = escapeHtml(embed.watchUrl);
    const thumb = `https://img.youtube.com/vi/${embed.videoId}/hqdefault.jpg`;
    return `
        <div class="relative w-full h-full group">
            <img src="${thumb}" alt="${escapeHtml(v.title)}" class="w-full h-full object-cover">
            <button type="button" onclick="loadYoutubePlayer('${v.id}', '${embed.videoId}')"
                class="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 text-white bg-black/40 group-hover:bg-black/50 transition">
                <span class="w-14 h-14 rounded-full bg-white/95 text-red-600 flex items-center justify-center text-2xl shadow-lg group-hover:scale-105 transition"><i class="fa-solid fa-play ms-1"></i></span>
                <span class="text-xs font-bold">${L('Tap to play', 'اضغط للتشغيل')}</span>
            </button>
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
                class="absolute bottom-2 right-2 text-[10px] font-bold bg-black/60 hover:bg-black/80 text-white px-2 py-1 rounded-md transition">
                <i class="fa-brands fa-youtube text-red-500 me-1"></i>YouTube
            </a>
        </div>
    `;
}

// Swaps the thumbnail facade for the real YouTube iframe (called on user tap only).
function loadYoutubePlayer(videoKey, videoId) {
    const slot = document.getElementById(`videoPlayer-${videoKey}`);
    if (!slot) return;
    slot.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0" title="YouTube video" class="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

function renderAboutVideos() {
    const box = document.getElementById('aboutVideos');
    if (!box) return;

    state.aboutVideos = loadAboutVideos();
    const canEdit = canEditAbout();
    const videos = state.aboutVideos;

    // Visitors only see this section once there is something to watch.
    if (!canEdit && videos.length === 0) {
        box.innerHTML = '';
        return;
    }

    const inputClass = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500';
    const adminForm = canEdit ? `
        <form onsubmit="handleAddVideoSubmit(event)" class="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs items-center">
            <input type="text" id="aboutVideoTitle" required maxlength="80" placeholder="${L('Video title', 'عنوان الفيديو')}" class="md:col-span-2 ${inputClass}">
            <input type="file" id="aboutVideoFile" accept="video/*" onchange="previewAboutVideoFile(event)" class="md:col-span-2 ${IMAGE_PICK_INPUT_CLS}">
            <button type="submit" class="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl py-3 uppercase tracking-wider transition"><i class="fa-solid fa-plus me-1"></i>${L('Add', 'إضافة')}</button>
        </form>
        <p id="aboutVideoFileName" class="text-[11px] text-slate-500 font-bold"></p>
        <p class="text-[11px] text-slate-400">${L('Only admins see this form. Pick a video file from your device (mp4/webm).', 'هذا النموذج يظهر للمسؤولين فقط. اختر ملف فيديو من جهازك (mp4/webm).')}</p>
    ` : '';

    const cards = videos.map(v => {
        const embed = getVideoEmbed(v.url);
        let player;
        if (!embed) {
            player = `<div class="w-full h-full flex items-center justify-center text-xs text-slate-400 p-4 text-center">${L('This link can’t be embedded.', 'لا يمكن تضمين هذا الرابط.')}</div>`;
        } else if (embed.kind === 'file') {
            player = `<video src="${escapeHtml(embed.src)}" controls preload="metadata" class="w-full h-full"></video>`;
        } else if (embed.platform === 'youtube') {
            // Click-to-play facade — no auto-loaded iframe, no Error 153.
            player = youtubeFacadeCardHtml(v, embed);
        } else {
            player = `<iframe src="${escapeHtml(embed.src)}" title="${escapeHtml(v.title)}" class="w-full h-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
        }
        const safeUrl = /^https?:\/\//i.test(v.url) ? escapeHtml(v.url) : '';
        return `
            <div class="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800/40">
                <div class="aspect-video bg-black" id="videoPlayer-${v.id}">${player}</div>
                <div class="p-3 flex items-center justify-between gap-3">
                    <span class="text-sm font-bold truncate">${escapeHtml(v.title)}</span>
                    <div class="flex items-center gap-3 shrink-0">
                        ${safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-bold text-sky-500 hover:underline">${L('Open', 'فتح')} <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i></a>` : ''}
                        ${canEdit ? `<button onclick="removeAboutVideo('${v.id}')" class="text-xs text-red-500 hover:text-red-600" title="${L('Remove video', 'حذف الفيديو')}"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    box.innerHTML = `
        <div class="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-500 flex items-center justify-center font-extrabold text-xl shrink-0">
                    <i class="fa-solid fa-circle-play"></i>
                </div>
                <div>
                    <h3 class="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">${L('Our Videos', 'فيديوهاتنا')}</h3>
                    <p class="text-xs sm:text-sm font-semibold text-slate-400 mt-0.5">${L('See how Cooling Art works', 'شاهد كيف تعمل كولينج آرت')}</p>
                </div>
            </div>
            ${adminForm}
            ${videos.length === 0
            ? `<p class="text-xs text-slate-400 text-center py-6">${L('No videos yet — add the first one above.', 'لا توجد فيديوهات بعد — أضف أول فيديو من الأعلى.')}</p>`
            : `<div class="grid grid-cols-1 md:grid-cols-2 gap-5">${cards}</div>`}
        </div>
    `;

}

// Holds the data URL of the video file picked in the "Add Video" form —
// videos are read from the device instead of pasted as a link.
let pendingAboutVideoData = null;

function previewAboutVideoFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    const nameBox = document.getElementById('aboutVideoFileName');
    if (!file) return;
    if (!file.type || !file.type.startsWith('video/')) {
        showToast(L('Please choose a video file.', 'يرجى اختيار ملف فيديو.'), 'error');
        return;
    }
    if (file.size > 15 * 1024 * 1024) {
        showToast(L('That video is large and may not save (device storage is limited) — a shorter clip works best.', 'هذا الفيديو كبير وقد لا يُحفظ (مساحة التخزين محدودة) — الأفضل استخدام مقطع أقصر.'), 'error');
        return;
    }
    readFileAsDataUrl(file).then(dataUrl => {
        pendingAboutVideoData = dataUrl;
        if (nameBox) nameBox.textContent = `${L('Selected', 'تم اختيار')}: ${file.name}`;
    }).catch(() => {
        showToast(L('Could not read that video file.', 'تعذر قراءة ملف الفيديو.'), 'error');
    });
}

function handleAddVideoSubmit(e) {
    e.preventDefault();
    if (!canEditAbout()) {
        showToast(L('Only admins can edit this section.', 'هذا القسم للمسؤولين فقط.'), 'error');
        return;
    }
    const title = document.getElementById('aboutVideoTitle').value.trim();
    const url = pendingAboutVideoData;
    if (!title || !url) {
        showToast(L('Please add a title and choose a video file.', 'يرجى إضافة عنوان واختيار ملف فيديو.'), 'error');
        return;
    }

    if (!getVideoEmbed(url)) {
        showToast(L('That video file could not be used — try a different file.', 'تعذر استخدام ملف الفيديو هذا — جرّب ملفاً آخر.'), 'error');
        return;
    }

    state.aboutVideos = loadAboutVideos();
    state.aboutVideos.push({
        id: createDateBasedId('VID'),
        title,
        url,
        addedBy: state.currentUser.username,
        addedAt: new Date().toISOString()
    });
    try {
        saveState();
    } catch (err) {
        state.aboutVideos.pop();
        showToast(L('Storage is full — remove an old video first.', 'مساحة التخزين ممتلئة — احذف فيديو قديم أولاً.'), 'error');
        return;
    }
    pendingAboutVideoData = null;
    showToast(L('Video added.', 'تمت إضافة الفيديو.'), 'success');
    renderAboutVideos();
}

function removeAboutVideo(videoId) {
    if (!canEditAbout()) {
        showToast(L('Only admins can edit this section.', 'هذا القسم للمسؤولين فقط.'), 'error');
        return;
    }
    if (!confirm(L('Remove this video?', 'حذف هذا الفيديو؟'))) return;
    state.aboutVideos = loadAboutVideos().filter(v => v.id !== videoId);
    saveState();
    showToast(L('Video removed.', 'تم حذف الفيديو.'), 'success');
    renderAboutVideos();
}

// ================= CONTACT PAGE (editable by head admin & admin) =================
const DEFAULT_CONTACT = { email: 'support@coolingart.com', phone: '+20 100 123 4567', whatsapp: '+20 100 123 4567' };

function loadContactInfo() {
    try {
        const stored = JSON.parse(localStorage.getItem('ca_contact'));
        if (stored && typeof stored === 'object') return { ...DEFAULT_CONTACT, ...stored };
    } catch (e) { /* use defaults */ }
    return { ...DEFAULT_CONTACT };
}

// "010 0123 4567" / "+20 100..." -> international digits for tel: and wa.me links.
function toInternationalDigits(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    else if (digits.startsWith('0')) digits = '20' + digits.slice(1);
    return digits;
}

function renderContactPage() {
    const box = document.getElementById('contactCards');
    if (!box) return;
    const info = loadContactInfo();
    const cardCls = 'p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 transition flex flex-col items-center text-center space-y-2 border border-slate-200 dark:border-slate-700';
    box.innerHTML = `
        <a href="mailto:${escapeHtml(info.email)}" class="${cardCls}">
            <i class="fa-solid fa-envelope text-sky-500 text-2xl"></i>
            <span class="text-xs font-bold">${escapeHtml(t('email_us', 'Email Us'))}</span>
            <span class="text-[10px] text-slate-400 break-all">${escapeHtml(info.email)}</span>
        </a>
        <a href="tel:+${toInternationalDigits(info.phone)}" class="${cardCls}">
            <i class="fa-solid fa-phone text-sky-500 text-2xl"></i>
            <span class="text-xs font-bold">${escapeHtml(t('call_hotline', 'Call Hotline'))}</span>
            <span class="text-[10px] text-slate-400" dir="ltr">${escapeHtml(info.phone)}</span>
        </a>
        <a href="https://wa.me/${toInternationalDigits(info.whatsapp)}" target="_blank" rel="noopener noreferrer"
            class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition flex flex-col items-center text-center space-y-2 border border-emerald-200 dark:border-emerald-800">
            <i class="fa-brands fa-whatsapp text-emerald-500 text-2xl"></i>
            <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400">${escapeHtml(t('whatsapp_live', 'WhatsApp Live'))}</span>
            <span class="text-[10px] text-emerald-600 dark:text-emerald-500" dir="ltr">${escapeHtml(info.whatsapp)}</span>
        </a>`;

    const form = document.getElementById('contactEditBox');
    if (!form) return;
    const canEdit = canEditAbout();
    form.classList.toggle('hidden', !canEdit);
    if (!canEdit) return;
    const setText = (id, en, ar) => { const el = document.getElementById(id); if (el) el.textContent = L(en, ar); };
    setText('contactEditTitle', 'Edit contact details', 'تعديل بيانات التواصل');
    setText('contactEditEmailLabel', 'Email', 'البريد الإلكتروني');
    setText('contactEditPhoneLabel', 'Hotline', 'الخط الساخن');
    setText('contactEditWhatsappLabel', 'WhatsApp', 'واتساب');
    const saveLabel = document.querySelector('#contactEditSave span');
    if (saveLabel) saveLabel.textContent = L('Save', 'حفظ');
    // Don't overwrite what the admin is typing while the form is focused.
    if (!form.contains(document.activeElement)) {
        document.getElementById('contactEditEmail').value = info.email;
        document.getElementById('contactEditPhone').value = info.phone;
        document.getElementById('contactEditWhatsapp').value = info.whatsapp;
    }
}

function handleContactEditSubmit(e) {
    e.preventDefault();
    if (!canEditAbout()) {
        showToast(L('Only admins can edit this section.', 'هذا القسم للمسؤولين فقط.'), 'error');
        return;
    }
    const email = document.getElementById('contactEditEmail').value.trim();
    const phone = document.getElementById('contactEditPhone').value.trim();
    const whatsapp = document.getElementById('contactEditWhatsapp').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
        showToast(L('Please enter a valid email address.', 'يرجى إدخال بريد إلكتروني صحيح.'), 'error');
        return;
    }
    if (toInternationalDigits(phone).length < 8 || toInternationalDigits(whatsapp).length < 8) {
        showToast(L('Please enter valid phone numbers.', 'يرجى إدخال أرقام هاتف صحيحة.'), 'error');
        return;
    }
    localStorage.setItem('ca_contact', JSON.stringify({ email, phone, whatsapp }));
    showToast(L('Contact details updated.', 'تم تحديث بيانات التواصل.'), 'success');
    document.activeElement && document.activeElement.blur();
    renderContactPage();
}

// ================= CUSTOMER DASHBOARD =================
function renderCustomerDashboard() {
    if (!state.currentUser) return;
    const u = state.currentUser;

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    setText('custDashName', u.name || u.username);
    setText('custDashUsername', `@${u.username}`);
    setText('custDashId', u.id || 'N/A');
    setText('custDashJoined', u.joinedDate || 'N/A');
    setText('custDashWhatsApp', u.whatsapp || 'N/A');
    setText('custDashPhone', u.contactPhone || 'N/A');
    setText('custDashRole', getRoleLabel(u.role));

    const myOrders = state.orders.filter(o => o.username.toLowerCase() === u.username.toLowerCase());
    setText('custDashOrderCount', myOrders.length);

    const ordersTable = document.getElementById('custDashOrdersTable');
    if (ordersTable) {
        if (myOrders.length === 0) {
            ordersTable.innerHTML = `<tr><td colspan="6" class="text-center p-6 text-slate-400 font-bold">No orders placed yet.</td></tr>`;
        } else {
            ordersTable.innerHTML = myOrders.map(o => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td class="p-4 text-slate-400 font-mono">${o.date}</td>
                    <td class="p-4 font-bold text-sky-500">${o.id}</td>
                    <td class="p-4 font-semibold">${o.itemTitle}</td>
                    <td class="p-4 font-extrabold">${getOrderRevenue(o).toLocaleString()} EGP</td>
                    <td class="p-4">${getStatusBadge(o.status)}${renderCustomerStageLine(o)}</td>
                    <td class="p-4">${renderCustomerFeedbackCell(o)}</td>
                </tr>
            `).join('');
        }
    }
}

// Small line under the status telling the customer which step of the repair they're at.
function renderCustomerStageLine(order) {
    if (order.type !== 'Tech Fix Service') return '';
    const task = getLinkedTaskForOrder(order.id);
    if (!task || task.status === 'Done') return '';
    const lines = {
        replace: L('Replacing a part', 'جاري استبدال قطعة'),
        withdraw: L('On the way to the workshop', 'وحدتك في الطريق إلى الورشة'),
        workshop: L('In the workshop — repair in progress', 'وحدتك في الورشة — جاري الإصلاح'),
        return: L('Arriving soon!', 'وحدتك في الطريق إليك — وصل قريباً!')
    };
    const text = lines[getTaskPhase(task)];
    return text ? `<span class="block mt-1 text-[10px] font-semibold text-slate-400">${text}</span>` : '';
}

// Cell shown in "My Orders & Bookings": prompts the customer to leave
// feedback once a unit/repair job's linked task has been marked Done by the
// technician, or shows what they already submitted.
function renderCustomerFeedbackCell(order) {
    if (order.type !== 'Product' && order.type !== 'Tech Fix Service') {
        return `<span class="text-slate-300 dark:text-slate-600">—</span>`;
    }
    const task = getLinkedTaskForOrder(order.id);
    if (!task || task.status !== 'Done') {
        return `<span class="text-[10px] font-bold text-slate-400 uppercase">Awaiting Completion</span>`;
    }
    const doneAt = task.completedAt || task.completedDate;
    const doneLine = doneAt
        ? `<span class="block text-[10px] text-slate-400 mt-1">${L('Job done', 'تم الإنجاز')}: ${escapeHtml(formatDateTime(doneAt))}</span>`
        : '';
    if (order.customerFeedback) {
        const isIssue = order.customerFeedback.status === 'Done - Issue Remains';
        const sentAt = order.customerFeedback.submittedAt || order.customerFeedback.submittedDate;
        const ratingLine = typeof order.customerFeedback.rating === 'number'
            ? `<span class="block mt-1">${renderStarRow(order.customerFeedback.rating, 'text-xs')}</span>`
            : '';
        return `<span class="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${isIssue ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'}">${isIssue ? 'Issue Reported' : 'Satisfied'}</span>`
            + ratingLine
            + doneLine
            + (sentAt ? `<span class="block text-[10px] text-slate-400 mt-0.5">${L('Feedback sent', 'تم إرسال التقييم')}: ${escapeHtml(formatDateTime(sentAt))}</span>` : '');
    }
    return `<button onclick="openFeedbackModal('${order.id}')" class="text-[11px] font-bold text-white bg-sky-500 hover:bg-sky-600 px-3 py-1.5 rounded-lg transition">Leave Feedback</button>${doneLine}`;
}

// ================= CUSTOMER FEEDBACK MODAL =================
let feedbackOrderId = null;
let feedbackRating = null; // null = not chosen yet, 0-5 = chosen

// The 0-5 star picker inside the feedback modal.
function renderFeedbackStars() {
    const box = document.getElementById('feedbackStars');
    if (!box) return;
    const stars = [1, 2, 3, 4, 5].map(n => {
        const filled = feedbackRating !== null && n <= feedbackRating;
        return `<button type="button" onclick="setFeedbackRating(${n})" aria-label="${n}" class="text-3xl leading-none transition ${filled ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'}"><i class="fa-solid fa-star"></i></button>`;
    }).join('');
    const zeroActive = feedbackRating === 0;
    const zeroBtn = `<button type="button" onclick="setFeedbackRating(0)" aria-label="0" class="ms-2 text-xs font-bold px-2.5 py-1 rounded-lg border transition ${zeroActive ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200' : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'}">0</button>`;
    const valueText = feedbackRating === null ? '' : `<span class="ms-2 text-xs font-bold text-slate-500">${feedbackRating} / 5</span>`;
    box.innerHTML = stars + zeroBtn + valueText;
}

function setFeedbackRating(value) {
    feedbackRating = value;
    const err = document.getElementById('feedbackRatingError');
    if (err) err.classList.add('hidden');
    renderFeedbackStars();
}

function openFeedbackModal(orderId) {
    feedbackOrderId = orderId;
    const statusInput = document.getElementById('feedbackStatusInput');
    const messageInput = document.getElementById('feedbackMessageInput');
    if (statusInput) statusInput.value = 'Done - Satisfied';
    if (messageInput) messageInput.value = '';
    feedbackRating = null;
    const ratingLabel = document.getElementById('feedbackRatingLabel');
    if (ratingLabel) ratingLabel.textContent = L('Rating (0 – 5 stars)', 'التقييم (من 0 إلى 5 نجوم)');
    const ratingError = document.getElementById('feedbackRatingError');
    if (ratingError) ratingError.classList.add('hidden');
    renderFeedbackStars();
    const modal = document.getElementById('feedbackModal');
    if (modal) modal.classList.remove('hidden');
}

function closeFeedbackModal() {
    feedbackOrderId = null;
    const modal = document.getElementById('feedbackModal');
    if (modal) modal.classList.add('hidden');
}

function submitCustomerFeedback() {
    if (!feedbackOrderId) return;
    const order = state.orders.find(o => o.id === feedbackOrderId);
    if (!order) return;

    const status = document.getElementById('feedbackStatusInput').value;
    const message = document.getElementById('feedbackMessageInput').value.trim();

    if (feedbackRating === null) {
        const ratingError = document.getElementById('feedbackRatingError');
        if (ratingError) {
            ratingError.textContent = L('Please choose a rating from 0 to 5.', 'يرجى اختيار تقييم من 0 إلى 5.');
            ratingError.classList.remove('hidden');
        }
        return;
    }

    const submittedNow = new Date();
    order.customerFeedback = {
        status,
        rating: feedbackRating,
        message: message || '',
        submittedAt: submittedNow.toISOString(),
        submittedDate: getLocalDateString(submittedNow)
    };
    saveState();
    closeFeedbackModal();
    showToast('Thanks for your feedback!', 'success');
    renderCustomerDashboard();
}

// Order references are not shown on the admin Task Board.
function stripOrderRef(text) {
    return String(text || '').replace(/\s*Order Ref:\s*[^\s.]+\.?/gi, '');
}

function buildTaskRow(task, technicianUsers, canManageTasks) {
    const needsAssignment = isTaskUnassigned(task);
    const isLate = isTaskLate(task);
    const phase = getTaskPhase(task);
    const loc = getTaskLocation(task);
    const waitingSince = getTaskWaitingSince(task);
    const assignedCell = (canManageTasks && task.status !== 'Done') ? `
        <select onchange="reassignTask('${task.id}', this.value)" class="bg-slate-100 dark:bg-slate-800 border rounded px-2 py-1 text-xs ${isLate ? 'border-red-500 text-red-600 font-bold' : needsAssignment ? 'border-yellow-400 text-yellow-600 font-bold' : ''}">
            ${needsAssignment ? `<option value="" disabled selected>-- Assign Technician --</option>` : ''}
            ${technicianUsers.map(tech => `<option value="${tech.username}" ${tech.username === task.assignedTo ? 'selected' : ''}>${tech.name || tech.username} (@${tech.username})</option>`).join('')}
        </select>
    ` : `<span class="font-bold">@${task.assignedTo}</span>`;
    const linkedOrder = task.orderId ? state.orders.find(o => o.id === task.orderId) : null;
    const customerCell = linkedOrder
        ? `<span class="font-bold text-slate-700 dark:text-slate-200">@${linkedOrder.username}</span><span class="block text-[10px] text-slate-400">${escapeHtml(linkedOrder.customerName || '')}</span>`
        : `<span class="text-slate-300 dark:text-slate-600 text-[11px]">N/A</span>`;

    const phaseChip = phase !== 'unit'
        ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">${escapeHtml(getPhaseLabel(phase))}</span>`
        : '';
    const stateChip = isLate
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-600 text-white uppercase"><i class="fa-solid fa-triangle-exclamation"></i> ${L('Late', 'متأخر')}</span>`
        : needsAssignment
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400 uppercase">Needs Assignment</span>`
            : '';

    return `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isLate ? 'bg-red-50 dark:bg-red-950/30 border-l-4 border-l-red-500' : needsAssignment ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}">
        <td class="p-4">
            <span class="font-semibold block leading-snug">${escapeHtml(task.title)}</span>
            <span class="mt-1.5 flex flex-wrap items-center gap-1">${phaseChip}${stateChip}</span>
            ${isLate ? `<span class="block text-[10px] text-red-600 dark:text-red-400 mt-1"><i class="fa-regular fa-clock me-1"></i>${L('Waiting since', 'بانتظار فني منذ')} ${escapeHtml(formatDateTime(waitingSince))}</span>` : ''}
        </td>
        <td class="p-4 text-slate-500 text-[11px] space-y-1">
            <span class="block leading-relaxed">${stripOrderRef(task.description)}</span>
            ${loc.label ? `<span class="block"><i class="fa-solid fa-location-dot text-sky-400 me-1"></i>${escapeHtml(getLocationLabel(loc.label))}</span>` : ''}
            ${loc.coords ? `<span class="block">${renderMapLink(loc.coords)}</span>` : ''}
            <span class="block text-slate-400">${L('Created', 'أُنشئت')} ${escapeHtml(formatDateTime(task.createdAt || task.createdDate))}${task.createdBy ? ` · ${escapeHtml(task.createdBy)}` : ''}</span>
            ${task.status === 'Open' && waitingSince && !isLate ? `<span class="block text-slate-400"><i class="fa-regular fa-clock me-1"></i>${L('Waiting since', 'بانتظار منذ')} ${escapeHtml(formatDateTime(waitingSince))}</span>` : ''}
        </td>
        <td class="p-4">${customerCell}</td>
        <td class="p-4">${assignedCell}</td>
        <td class="p-4 text-slate-500 text-[11px]">${task.priority}</td>
        <td class="p-4 text-slate-500 text-[11px]">${task.dueDate || 'N/A'}</td>
        <td class="p-4">${renderTaskStatusBadge(task.status)}${(task.status === 'Done' && (task.completedAt || task.completedDate)) ? `<span class="block text-[10px] text-slate-400 mt-1">${escapeHtml(formatDateTime(task.completedAt || task.completedDate))}</span>` : ''}${renderReceivedLine(task)}${getRepairPhotoCount(task) ? `<span class="block mt-1.5">${renderRepairPhotosIcon(task)}</span>` : ''}</td>
    </tr>
    `;
}

// ================= ADMIN DASHBOARD RENDER =================
function renderAdminDashboard() {
    state.users = JSON.parse(localStorage.getItem('ca_users')) || state.users;
    state.orders = JSON.parse(localStorage.getItem('ca_orders')) || state.orders;
    state.tasks = JSON.parse(localStorage.getItem('ca_tasks')) || state.tasks;

    if (!state.currentUser || !isStaffRole(state.currentUser.role)) return;

    const isHeadAdmin = isTopAdmin(state.currentUser.role);
    const isRealHead = state.currentUser.role === 'head-admin';
    const isHR = state.currentUser.role === 'hr';
    const isTechnician = state.currentUser.role === 'technician';
    if (isHeadAdmin && purgeOrphans()) saveState();
    const canManageTasks = isHeadAdmin || isHR;
    const technicianUsers = state.users.filter(user => user.role === 'technician');

    // ---- Analytics Grid: full business stats for head admin, task stats for
    // technicians, hidden entirely for Customer Services (they only need tasks + customers) ----
    const grid = document.getElementById('adminAnalyticsGrid');
    if (isHeadAdmin) {
        grid.classList.remove('hidden');
        const totalRev = Math.max(0, state.orders.reduce((sum, o) => sum + getOrderRevenue(o), 0) - state.revenueResetBaseline);

        grid.innerHTML = `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div class="flex items-start justify-between gap-3">
                    <span class="text-xs font-bold text-slate-400 uppercase">Total Revenue</span>
                    <button onclick="confirmResetTotalRevenue()" class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition">Reset</button>
                </div>
                <h3 class="text-2xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">${totalRev.toLocaleString()} EGP</h3>
                ${state.revenueResetBaseline ? '<p class="text-[10px] text-slate-400">Revenue is currently counted from the last reset.</p>' : ''}
            </div>
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span class="text-xs font-bold text-slate-400 uppercase">${t('customers', 'Customers')}</span>
                <h3 class="text-2xl font-extrabold mt-1">${state.users.length}</h3>
            </div>
        `;
    } else {
        grid.classList.add('hidden');
        grid.innerHTML = '';
    }

    // ---- Standalone top counters: Total Tasks & Negative Ratings (head admin & Customer Services) ----
    const topCounters = document.getElementById('adminTopCountersGrid');
    if (topCounters) {
        if (canManageTasks) {
            topCounters.classList.remove('hidden');
            // Open tasks only — matches what the Task Board below is actually counting.
            const totalTasksCount = state.tasks.filter(t => t.status !== 'Done').length;
            const negativeRatingsCount = state.orders.filter(o =>
                o.customerFeedback && typeof o.customerFeedback.rating === 'number' && o.customerFeedback.rating <= 2
            ).length;
            topCounters.innerHTML = `
                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-500 flex items-center justify-center text-xl shrink-0"><i class="fa-solid fa-list-check"></i></div>
                    <div>
                        <span class="text-xs font-bold text-slate-400 uppercase">${t('total_tasks')}</span>
                        <h3 class="text-2xl font-extrabold mt-0.5">${totalTasksCount}</h3>
                    </div>
                </div>
                <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950 text-red-500 flex items-center justify-center text-xl shrink-0"><i class="fa-solid fa-star-half-stroke"></i></div>
                    <div>
                        <span class="text-xs font-bold text-slate-400 uppercase">${t('negative_ratings')}</span>
                        <h3 class="text-2xl font-extrabold text-red-500 mt-0.5">${negativeRatingsCount}</h3>
                    </div>
                </div>`;
        } else {
            topCounters.classList.add('hidden');
            topCounters.innerHTML = '';
        }
    }

    // ---- Task Board section: visible to task managers (head admin/Customer Services) and to
    // technicians (their own assigned tasks) ----
    const tasksSection = document.getElementById('adminTasksSection');
    if (tasksSection) {
        tasksSection.classList.toggle('hidden', !canManageTasks && !isTechnician);
    }
    // Create Staff Account icon (opens the modal) — visible to head admin only
    const btnOpenStaffAccount = document.getElementById('btnOpenStaffAccount');
    if (btnOpenStaffAccount) btnOpenStaffAccount.classList.toggle('hidden', !isHeadAdmin);

    // Staff Account Creation Form (Head Admin Only) — this is how Customer Services and Technician
    // accounts get created, instead of them signing up as customers or being hardcoded.
    const staffFormBox = document.getElementById('adminStaffFormBox');
    if (staffFormBox) {
        staffFormBox.innerHTML = isHeadAdmin ? `
            <div class="space-y-4">
                <p class="text-[11px] text-slate-400">Only the Admin or the Executive Director can add employees. Employee accounts never go through the public signup form.</p>
                <form onsubmit="handleCreateStaffSubmit(event)" class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                        <label class="block font-bold uppercase text-slate-500 mb-1">Category</label>
                        <select id="staffCategory" required onchange="updateStaffPositionOptions()" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500">
                            <option value="technical">Technical</option>
                            <option value="customer-service">Customer Service</option>
                            ${isRealHead ? '<option value="executive">Executive Director</option>' : ''}
                        </select>
                    </div>
                    <div id="staffPositionWrap">
                        <label class="block font-bold uppercase text-slate-500 mb-1">Position</label>
                        <select id="staffPosition" required class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500"></select>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block font-bold uppercase text-slate-500 mb-1">Full Name</label>
                        <input type="text" id="staffFullName" required placeholder="e.g., Mona Adel" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500">
                    </div>
                    <div>
                        <label class="block font-bold uppercase text-slate-500 mb-1">Username</label>
                        <input type="text" id="staffUsername" required placeholder="e.g., mona.cs" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500">
                    </div>
                    <div>
                        <label class="block font-bold uppercase text-slate-500 mb-1">Password</label>
                        <input type="text" id="staffPassword" required placeholder="Set a password" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500">
                    </div>
                    <div>
                        <label class="block font-bold uppercase text-slate-500 mb-1">WhatsApp Number</label>
                        <input type="tel" id="staffWhatsApp" placeholder="e.g., 01098765432" maxlength="11" inputmode="numeric" pattern="[0-9]{11}" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500">
                    </div>
                    <div>
                        <label class="block font-bold uppercase text-slate-500 mb-1">Contact Phone</label>
                        <input type="tel" id="staffContactPhone" placeholder="e.g., 01098765432" maxlength="11" inputmode="numeric" pattern="[0-9]{11}" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block font-bold uppercase text-slate-500 mb-1">Profile Photo</label>
                        <div class="flex items-center gap-4">
                            <div id="staffPhotoPreview" class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600 shrink-0 overflow-hidden">
                                <i class="fa-solid fa-user text-2xl"></i>
                            </div>
                            <input type="file" id="staffPhoto" accept="image/*" onchange="previewStaffPhoto(event)" class="flex-1 text-[11px] file:me-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:font-bold file:bg-sky-100 file:text-sky-600 dark:file:bg-sky-950 dark:file:text-sky-400 hover:file:bg-sky-200">
                        </div>
                        <p class="text-[10px] text-slate-400 mt-1">Optional — shown on the "Who Are We" team page. JPG/PNG, under 1&nbsp;MB.</p>
                    </div>
                    <div class="md:col-span-2">
                        <button type="submit" class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl uppercase tracking-wider transition">Add Employee</button>
                    </div>
                </form>
            </div>
        ` : '';
    }
    if (isHeadAdmin) updateStaffPositionOptions();

    // ---- Registered Customers section: visible to head admin & Customer Services only.
    // Only customer accounts are listed here — staff accounts live in "Who Are We". ----
    const usersSection = document.getElementById('adminUsersSection');
    if (usersSection) usersSection.classList.toggle('hidden', isTechnician);

    if (!isTechnician) {
        const usersTbody = document.getElementById('adminUsersTable');
        const userSearchInput = document.getElementById('adminUserSearch');
        const userSearchTerm = userSearchInput ? userSearchInput.value.trim().toLowerCase() : '';
        const customerUsers = state.users.filter(u => !isStaffRole(u.role));
        const filteredUsers = !userSearchTerm ? customerUsers : customerUsers.filter(u => {
            return [u.id, u.username, u.name, u.whatsapp, u.contactPhone]
                .filter(Boolean)
                .some(field => String(field).toLowerCase().includes(userSearchTerm));
        });

        if (filteredUsers.length === 0) {
            usersTbody.innerHTML = `<tr><td colspan="7" class="text-center p-6 text-slate-400 font-bold">No customers match your search.</td></tr>`;
        } else {
            usersTbody.innerHTML = filteredUsers.map(u => {
                const count = state.orders.filter(o => o.username.toLowerCase() === u.username.toLowerCase()).length;
                const canDelete = isHeadAdmin;
                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td class="p-4 font-mono text-slate-400 text-[11px]">${u.id}</td>
                        <td class="p-4 font-bold text-sky-500">@${u.username}</td>
                        <td class="p-4 font-semibold">${u.name || 'N/A'}</td>
                        <td class="p-4 text-slate-500 font-mono">${u.whatsapp || 'N/A'}</td>
                        <td class="p-4 text-slate-500 font-mono">${u.contactPhone || 'N/A'}</td>
                        <td class="p-4 font-bold">${count}</td>
                        <td class="p-4 text-center">
                            ${canDelete ? `
                                <button onclick="openDeleteUserModal('${u.id}', '${u.username}')" class="text-xs font-bold text-red-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800 transition" title="Delete User">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // ---- Global Orders & Repairs section: head admin only ----
    const ordersSection = document.getElementById('adminOrdersSection');
    if (ordersSection) ordersSection.classList.toggle('hidden', !isHeadAdmin);

    if (isHeadAdmin) {
        // Only customers ever place orders — staff accounts (admin/Customer Services/
        // technician) shouldn't show up here at all, even under "All Users".
        const staffUsernames = new Set(state.users.filter(u => isStaffRole(u.role)).map(u => u.username.toLowerCase()));
        const customerOrders = state.orders.filter(o => !staffUsernames.has(String(o.username || '').toLowerCase()));

        // Populates and preserves the User Filter Dropdown Selection
        const filterSelect = document.getElementById('adminOrderUserFilter');
        const selectedUser = filterSelect ? filterSelect.value : 'all';

        if (filterSelect) {
            const userList = state.users.filter(u => !isStaffRole(u.role)).map(u => u.username);

            let optionsHtml = `<option value="all">All Users</option>`;
            userList.forEach(uname => {
                const uObj = state.users.find(u => u.username.toLowerCase() === uname.toLowerCase());
                const label = uObj && uObj.name ? `@${uname} (${uObj.name})` : `@${uname}`;
                const isSelected = (uname.toLowerCase() === selectedUser.toLowerCase()) ? 'selected' : '';
                optionsHtml += `<option value="${uname}" ${isSelected}>${label}</option>`;
            });
            filterSelect.innerHTML = optionsHtml;
        }

        const currentFilter = filterSelect ? filterSelect.value : 'all';
        const filteredOrders = currentFilter === 'all'
            ? customerOrders
            : customerOrders.filter(o => o.username.toLowerCase() === currentFilter.toLowerCase());

        // Admin Orders Table Rendering
        const ordersTbody = document.getElementById('adminOrdersTable');
        if (filteredOrders.length === 0) {
            ordersTbody.innerHTML = `<tr><td colspan="8" class="text-center p-8 text-slate-400 font-bold">No orders found for the selected user.</td></tr>`;
        } else {
            ordersTbody.innerHTML = filteredOrders.map(o => `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td class="px-5 py-4 text-slate-400 font-mono text-xs whitespace-nowrap">${o.date}</td>
                    <td class="px-5 py-4 font-bold text-sky-500 text-xs whitespace-nowrap">${o.id}</td>
                    <td class="px-5 py-4 whitespace-nowrap">
                        ${getStatusBadge(o.status)}
                        ${(o.type === 'Product' || o.type === 'Tech Fix Service') ? `<div class="mt-1">${renderOrderTaskBadge(o.id)}</div>` : ''}
                    </td>
                    <td class="px-5 py-4 whitespace-nowrap">
                        <span class="font-bold text-slate-800 dark:text-slate-100">@${o.username}</span>
                    </td>
                    <td class="px-5 py-4 font-bold text-slate-800 dark:text-slate-100 leading-snug">${escapeHtml(o.itemTitle)}</td>
                    <td class="px-5 py-4 text-slate-500 font-semibold text-xs whitespace-nowrap">${escapeHtml(getLocationLabel(o.location) || 'N/A')}</td>
                    <td class="px-5 py-4 text-center whitespace-nowrap">
                        <div class="inline-flex items-center gap-2">
                            <button type="button" onclick="openOrderDetailsModal('${o.id}')"
                                class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-extrabold rounded-xl text-xs transition shadow-sm hover:scale-105"
                                title="${L('View Full Details', 'عرض التفاصيل الكاملة')}">
                                <i class="fa-solid fa-eye"></i> ${L('Details', 'التفاصيل')}
                            </button>
                            <button type="button" data-order-title="${escapeHtml(o.itemTitle)}" onclick="openDeleteOrderModal('${o.id}', this.dataset.orderTitle)"
                                class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded-xl text-xs transition shadow-sm hover:scale-105"
                                title="${L('Delete Order', 'حذف الطلب')}">
                                <i class="fa-solid fa-trash-can"></i> ${L('Delete', 'حذف')}
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }

    // ---- Team Accounts section: head admin only — shows all Customer Services & Technician staff ----
    const teamSection = document.getElementById('adminTeamSection');
    if (teamSection) teamSection.classList.toggle('hidden', !isHeadAdmin);

    if (isHeadAdmin) {
        const teamTbody = document.getElementById('adminTeamTable');
        const staffUsers = state.users.filter(u => isStaffRole(u.role) && u.role !== 'head-admin');
        if (staffUsers.length === 0) {
            teamTbody.innerHTML = `<tr><td colspan="8" class="text-center p-6 text-slate-400 font-bold">No staff accounts created yet.</td></tr>`;
        } else {
            teamTbody.innerHTML = staffUsers.map(u => {
                const roleColors = {
                    'hr': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
                    'technician': 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400',
                    'admin': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
                    'executive': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                };
                const roleColor = roleColors[u.role] || 'bg-slate-100 text-slate-500';
                const roleLabel = getPositionLabel(u);
                const canDeleteRow = !(u.role === 'executive' && !isRealHead);
                return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td class="p-4">
                            <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-slate-300 dark:text-slate-600">
                                ${u.photo ? `<img src="${u.photo}" class="w-full h-full object-cover" alt="${escapeHtml(u.name || u.username)}">` : '<i class="fa-solid fa-user"></i>'}
                            </div>
                        </td>
                        <td class="p-4 font-mono text-slate-400 text-[11px]">${u.id}</td>
                        <td class="p-4 font-bold text-sky-500">@${u.username}</td>
                        <td class="p-4 font-semibold">${u.name || 'N/A'}</td>
                        <td class="p-4"><span class="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${roleColor}">${roleLabel}</span></td>
                        <td class="p-4 text-slate-500 font-mono">${u.whatsapp || 'N/A'}</td>
                        <td class="p-4 text-slate-500 font-mono">${u.contactPhone || 'N/A'}</td>
                        <td class="p-4 text-center">
                            ${canDeleteRow ? `<button onclick="openDeleteUserModal('${u.id}', '${u.username}')" class="text-xs font-bold text-red-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-slate-800 transition" title="Delete Staff Account">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>` : ''}
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    taskBoardSignature = getTaskBoardSignature();

    const countersBox = document.getElementById('adminTaskCounters');
    if (countersBox) {
        countersBox.classList.toggle('hidden', !canManageTasks);
        if (canManageTasks) countersBox.innerHTML = renderTaskCounters();
    }

    // List of the clicked counter, shown right under the counters.
    const filterPanel = document.getElementById('adminTaskFilterPanel');
    if (filterPanel) {
        const def = TASK_COUNTERS.find(d => d.key === activeTaskCounter);
        const showPanel = canManageTasks && !!def;
        filterPanel.classList.toggle('hidden', !showPanel);
        if (showPanel) {
            const list = getTasksForCounter(def.key);
            document.getElementById('adminTaskFilterTitle').textContent = `${L(def.en, def.ar)} (${list.length})`;
            const mainHead = document.getElementById('adminTasksTable').parentElement.querySelector('thead');
            document.getElementById('adminTaskFilterHead').innerHTML = mainHead ? mainHead.innerHTML : '';
            document.getElementById('adminTaskFilterBody').innerHTML = list.length
                ? list.map(task => buildTaskRow(task, technicianUsers, canManageTasks)).join('')
                : `<tr><td colspan="7" class="text-center p-6 text-slate-400 font-bold">No tasks in this category.</td></tr>`;
        }
    }

    // When a counter is selected, only that counter's list is shown (the full board is hidden).
    const mainWrap = document.getElementById('adminTaskMainWrap');
    if (mainWrap) mainWrap.classList.toggle('hidden', canManageTasks && TASK_COUNTERS.some(d => d.key === activeTaskCounter));

    const taskTable = document.getElementById('adminTasksTable');
    if (taskTable) {
        // Done tasks leave the board — they live on the customer's row in the Global Orders list.
        const activeTasks = state.tasks.filter(task => task.status !== 'Done');
        const visibleTasks = canManageTasks ? activeTasks : activeTasks.filter(task => task.assignedTo === state.currentUser.username);
        if (visibleTasks.length === 0) {
            taskTable.innerHTML = `<tr><td colspan="7" class="text-center p-6 text-slate-400 font-bold">No active tasks.</td></tr>`;
        } else {
            taskTable.innerHTML = visibleTasks.map(task => buildTaskRow(task, technicianUsers, canManageTasks)).join('');
        }
    }

    renderAdminChats();
    applyRoleBasedNav();
}

// ================= SERVICE AREAS MANAGER (head admin & admin) =================
function canManageAreas() {
    return !!state.currentUser && (isTopAdmin(state.currentUser.role) || state.currentUser.role === 'admin');
}

function renderAreasManager() {
    const section = document.getElementById('adminAreasSection');
    if (!section) return;
    section.classList.toggle('hidden', !canManageAreas());
    if (!canManageAreas()) return;

    const list = document.getElementById('adminAreasList');
    if (!list) return;
    if (!state.areas.length) {
        list.innerHTML = `<p class="text-xs text-amber-600 dark:text-amber-400 font-bold">No areas yet — customers cannot book repairs until you add at least one.</p>`;
        return;
    }
    list.innerHTML = state.areas.map((a, i) => `
        <span class="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full ps-3 pe-1.5 py-1 text-xs font-semibold">
            ${escapeHtml(a.name)}${a.nameAr ? `<span class="text-slate-400 font-normal" dir="rtl">${escapeHtml(a.nameAr)}</span>` : ''}
            <button type="button" onclick="removeArea(${i})" class="w-5 h-5 rounded-full text-slate-400 hover:text-white hover:bg-red-500 flex items-center justify-center transition" title="Remove area">
                <i class="fa-solid fa-xmark text-[10px]"></i>
            </button>
        </span>
    `).join('');
}

function handleAddAreaSubmit(e) {
    e.preventDefault();
    if (!canManageAreas()) {
        showToast('Only the head admin or an admin can manage service areas.', 'error');
        return;
    }
    const nameInput = document.getElementById('newAreaName');
    const nameArInput = document.getElementById('newAreaNameAr');
    const name = nameInput.value.trim().replace(/\s+/g, ' ');
    const nameAr = nameArInput.value.trim().replace(/\s+/g, ' ');

    if (!name) {
        showToast('Please type the area name.', 'error');
        nameInput.focus();
        return;
    }
    const lower = name.toLowerCase();
    if (lower === OTHER_AREA.toLowerCase() || state.areas.some(a => a.name.toLowerCase() === lower)) {
        showToast(`"${name}" is already in the list.`, 'error');
        nameInput.focus();
        return;
    }

    state.areas.push({ name, nameAr });
    saveState();
    showToast(`Area "${name}" added — customers can pick it right away.`, 'success');
    nameInput.value = '';
    nameArInput.value = '';
    renderAreasManager();
    nameInput.focus();
}

function removeArea(index) {
    if (!canManageAreas()) {
        showToast('Only the head admin or an admin can manage service areas.', 'error');
        return;
    }
    const area = state.areas[index];
    if (!area) return;
    if (!window.confirm(L(`Remove "${area.name}" from the service areas? Past orders keep their saved location.`, `حذف "${area.name}" من مناطق الخدمة؟ الطلبات السابقة تحتفظ بموقعها المحفوظ.`))) return;
    state.areas.splice(index, 1);
    saveState();
    showToast(`Area "${area.name}" removed.`, 'success');
    renderAreasManager();
}

// ================= ORDER DETAILS MODAL =================
function openOrderDetailsModal(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const modal = document.getElementById('orderDetailsModal');
    const subtitle = document.getElementById('orderDetailsSubtitle');
    const body = document.getElementById('orderDetailsBody');

    if (subtitle) {
        subtitle.textContent = `${order.id} · ${order.date || ''}`;
    }

    const customerUser = state.users.find(u => u.username.toLowerCase() === (order.username || '').toLowerCase());
    const phone = (customerUser && customerUser.contactPhone) || (customerUser && customerUser.whatsapp) || '';
    const whatsapp = (customerUser && customerUser.whatsapp) || phone;

    const task = state.tasks.find(t => t.orderId === order.id);
    const techUser = task ? state.users.find(u => u.username === task.assignedTo) : null;

    const whatsappBtn = whatsapp ? `
        <a href="https://wa.me/2${whatsapp.replace(/\D/g, '')}" target="_blank" rel="noopener noreferrer"
           class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-xs transition shadow-sm">
            <i class="fa-brands fa-whatsapp text-sm"></i> WhatsApp
        </a>
    ` : '';

    const mapBtn = order.locationCoords ? `
        <a href="https://www.google.com/maps/dir/?api=1&destination=${order.locationCoords.lat},${order.locationCoords.lng}" target="_blank" rel="noopener noreferrer"
           class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-extrabold rounded-xl text-xs transition me-2 shadow-sm">
            <i class="fa-solid fa-diamond-turn-right me-1"></i> ${L('Navigate', 'الملاحة')}
        </a>
    ` : '';

    const statusBadge = getStatusBadge(order.status);
    const taskBadge = (order.type === 'Product' || order.type === 'Tech Fix Service') ? renderOrderTaskBadge(order.id) : '';

    if (body) {
        body.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Customer Card -->
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <span class="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">${L('Customer Information', 'معلومات العميل')}</span>
                    <h4 class="font-extrabold text-sm text-slate-800 dark:text-slate-100">${escapeHtml(customerUser ? customerUser.name : order.username)}</h4>
                    <p class="text-xs text-slate-500 font-mono">@${escapeHtml(order.username)} ${customerUser ? `(ID: ${customerUser.id})` : ''}</p>
                    <div class="pt-1 flex flex-wrap items-center gap-2">
                        ${phone ? `<span class="text-xs font-semibold text-slate-600 dark:text-slate-300"><i class="fa-solid fa-phone me-1 text-sky-500"></i>${phone}</span>` : ''}
                        ${whatsappBtn}
                    </div>
                </div>

                <!-- Status & Payment Card -->
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <span class="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">${L('Status & Payment', 'الحالة والدفع')}</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        ${statusBadge}
                        ${taskBadge}
                    </div>
                    <div class="pt-1 text-xs space-y-1 text-slate-600 dark:text-slate-300">
                        <p><strong>${L('Gateway:', 'بوابة الدفع:')}</strong> ${escapeHtml(order.gateway || 'N/A')}</p>
                        <p><strong>${L('Base Amount:', 'المبلغ الأساسي:')}</strong> <span class="font-extrabold text-sky-600 dark:text-sky-400">${order.amount > 0 ? `${order.amount.toLocaleString()} EGP` : L('On-Site Quote', 'فحص ميداني')}</span></p>
                        ${getCollectedAmount(order) > 0 ? `<p class="text-emerald-600 dark:text-emerald-400 font-bold"><strong>${L('Collected by Tech:', 'المحصل بواسطة الفني:')}</strong> ${getCollectedAmount(order).toLocaleString()} EGP</p>` : ''}
                    </div>
                </div>
            </div>

            <!-- Item / Request Details -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <span class="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">${L('Request Details', 'تفاصيل الطلب')}</span>
                <h4 class="font-bold text-sm text-slate-800 dark:text-slate-100">${escapeHtml(order.itemTitle)}</h4>
                ${order.specs ? `<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">${escapeHtml(order.specs)}</p>` : ''}
                ${order.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800"><i class="fa-regular fa-comment-dots me-1 text-sky-500"></i>"${escapeHtml(order.notes)}"</p>` : ''}
            </div>

            <!-- Location Details -->
            <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <span class="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">${L('Delivery / Service Location', 'موقع التسليم / الخدمة')}</span>
                <p class="text-xs font-semibold text-slate-700 dark:text-slate-200"><i class="fa-solid fa-location-dot me-1.5 text-sky-500"></i>${escapeHtml(getLocationLabel(order.location) || L('Not specified', 'غير محدد'))}</p>
                ${order.customerAddress ? `<p class="text-xs text-slate-500 dark:text-slate-400"><i class="fa-solid fa-house me-1 text-slate-400"></i>${escapeHtml(order.customerAddress)}</p>` : ''}
                ${mapBtn ? `<div class="pt-2">${mapBtn}</div>` : ''}
            </div>

            <!-- Assigned Technician & Feedback -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span class="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">${L('Assigned Technician', 'الفني المكلف')}</span>
                    <p class="text-xs font-bold text-slate-800 dark:text-slate-100">${techUser ? escapeHtml(techUser.name) + ` (@${techUser.username})` : L('Unassigned / Head Admin', 'غير معين / الإدارة')}</p>
                </div>
                <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span class="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">${L('Customer Rating & Feedback', 'تقييم وملاحظات العميل')}</span>
                    <div>${renderOrderFeedbackCell(order)}</div>
                </div>
            </div>
        `;
    }

    if (modal) { modal.style.display = 'flex'; }
}

function closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) { modal.style.display = 'none'; }
}

window.openOrderDetailsModal = openOrderDetailsModal;
window.closeOrderDetailsModal = closeOrderDetailsModal;

    // Shows the technician's own progress on the task — Open (not yet
    // accepted), In Progress (accepted), or Done — as a plain badge here since
    // admin/Customer Services only view this status; the technician changes it from Home.
    function renderTaskStatusBadge(status) {
        const styles = {
            'Open': 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
            'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
            'Done': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
        };
        return `<span class="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${styles[status] || styles['Open']}">${status}</span>`;
    }

    // Feedback for one order, shown in the Global Orders table: the customer's own
    // rating/status once the linked job is Done (or what it's still waiting for).
    function renderOrderFeedbackCell(order) {
        if (order.type !== 'Product' && order.type !== 'Tech Fix Service') {
            return `<span class="text-slate-300 dark:text-slate-600 text-[11px]">—</span>`;
        }
        if (!order.customerFeedback) {
            const task = getLinkedTaskForOrder(order.id);
            if (task && task.status === 'Done') {
                return `<span class="text-[10px] font-bold text-amber-500 uppercase">Awaiting Customer</span>`;
            }
            return `<span class="text-[10px] font-bold text-slate-400 uppercase">Job Not Done Yet</span>`;
        }
        const fb = order.customerFeedback;
        const isIssue = fb.status === 'Done - Issue Remains';
        const ratingLine = typeof fb.rating === 'number'
            ? `<span class="block mt-1">${renderStarRow(fb.rating, 'text-xs')}</span>`
            : '';
        const removedBadge = fb.hidden
            ? `<span class="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400" title="${escapeHtml(formatDateTime(fb.hiddenAt))}"><i class="fa-solid fa-eye-slash me-1"></i>${t('removed_badge')}</span>`
            : '';
        return `
        ${removedBadge}
        <span class="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${isIssue ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'}">${isIssue ? 'Issue Reported' : 'Satisfied'}</span>
        ${ratingLine}
        <span class="block text-[10px] text-slate-400 mt-1">${escapeHtml(formatDateTime(fb.submittedAt || fb.submittedDate))}</span>
        ${fb.message ? `<span class="block text-[10px] text-slate-400 mt-1 italic max-w-[160px]">"${escapeHtml(fb.message)}"</span>` : ''}
    `;
    }


    // ================= REPAIR PHOTOS (4 images the technician attaches once the money is in hand) =================
    // Right after collecting payment — and before the job can be marked Done —
    // the technician attaches 4 photos: a shot of the Compressor and of its
    // Serial/Model plate, plus a shot of the Fan and of its Serial/Model plate.
    const REPAIR_PHOTO_SLOTS = [
        ['compressorSerial', ['Compressor Serial', 'سيريال الكومبريسور']],
        ['compressorModel', ['Compressor Model', 'موديل الكومبريسور']],
        ['fanSerial', ['Fan Serial', 'سيريال المروحة']],
        ['fanModel', ['Fan Model', 'موديل المروحة']]
    ];

    // Photo bytes live in IndexedDB, not localStorage — see note above
    // previewRepairPhoto() for why. task.repairPhotos only stores `true` per
    // filled slot (tiny, safe to keep in the ca_tasks localStorage blob).
    // repairPhotoCache mirrors whatever's been loaded/just picked this session
    // so every render below stays synchronous; a cache miss (e.g. right after
    // a page reload) kicks off an async IndexedDB read that patches the <img>
    // in place once it resolves.
    const REPAIR_PHOTO_DB_NAME = 'ca_repair_photos_db';
    const REPAIR_PHOTO_STORE = 'photos';
    let repairPhotoDbPromise = null;
    const repairPhotoCache = {};
    const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

    function repairPhotoDbKey(taskId, slot) { return `${taskId}::${slot}`; }
    function repairPhotoImgId(taskId, slot) { return `rp-img-${taskId}-${slot}`; }
    function getCachedRepairPhoto(taskId, slot) { return repairPhotoCache[repairPhotoDbKey(taskId, slot)]; }

    function openRepairPhotoDb() {
        if (repairPhotoDbPromise) return repairPhotoDbPromise;
        repairPhotoDbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) { reject(new Error('no-indexeddb')); return; }
            const req = indexedDB.open(REPAIR_PHOTO_DB_NAME, 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(REPAIR_PHOTO_STORE)) req.result.createObjectStore(REPAIR_PHOTO_STORE);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return repairPhotoDbPromise;
    }

    function saveRepairPhotoToDb(taskId, slot, dataUrl) {
        return openRepairPhotoDb().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction(REPAIR_PHOTO_STORE, 'readwrite');
            tx.objectStore(REPAIR_PHOTO_STORE).put(dataUrl, repairPhotoDbKey(taskId, slot));
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        }));
    }

    function loadRepairPhotoFromDb(taskId, slot) {
        return openRepairPhotoDb().then(db => new Promise((resolve, reject) => {
            const tx = db.transaction(REPAIR_PHOTO_STORE, 'readonly');
            const req = tx.objectStore(REPAIR_PHOTO_STORE).get(repairPhotoDbKey(taskId, slot));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        }));
    }

    // Renders an <img> for a slot using whatever's cached right now (or a blank
    // placeholder), and if it wasn't cached, loads it from IndexedDB in the
    // background and patches this exact <img> (by id) once the bytes arrive.
    function repairPhotoImgHtml(taskId, slot, cls, rawValue) {
        if (typeof rawValue === 'string' && rawValue.startsWith('data:')) {
            // Old format from before repair photos moved to IndexedDB — the
            // task already holds the actual data URL, so just show it.
            repairPhotoCache[repairPhotoDbKey(taskId, slot)] = rawValue;
            return `<img id="${repairPhotoImgId(taskId, slot)}" src="${rawValue}" class="${cls}" alt="">`;
        }
        const cached = getCachedRepairPhoto(taskId, slot);
        const id = repairPhotoImgId(taskId, slot);
        if (!cached) {
            loadRepairPhotoFromDb(taskId, slot).then(dataUrl => {
                if (!dataUrl) return;
                repairPhotoCache[repairPhotoDbKey(taskId, slot)] = dataUrl;
                const img = document.getElementById(id);
                if (img) img.src = dataUrl;
            }).catch(() => { });
        }
        return `<img id="${id}" src="${cached || TRANSPARENT_PIXEL}" class="${cls}" alt="">`;
    }

    // Small pill/icon shown on a task once it has at least one repair photo —
    // tap it to open the photos in the viewer modal instead of always showing
    // them inline. Used on the technician log and the admin/CS Task Board.
    function getRepairPhotoCount(task) {
        const photos = task.repairPhotos || {};
        return REPAIR_PHOTO_SLOTS.filter(([key]) => photos[key]).length;
    }

    function renderRepairPhotosIcon(task, compact) {
        if (task.orderType !== 'Tech Fix Service') return '';
        const count = getRepairPhotoCount(task);
        if (!count) return '';
        if (compact) {
            return `<button type="button" onclick="openPhotoViewerModal('${task.id}')"
            class="mt-1 inline-flex items-center gap-1 text-[9px] font-extrabold text-sky-600 dark:text-sky-400 hover:underline uppercase tracking-wide">
            <i class="fa-solid fa-images"></i> ${L('Photos', 'الصور')} (${count})
        </button>`;
        }
        return `
        <button type="button" onclick="openPhotoViewerModal('${task.id}')"
            class="inline-flex items-center gap-1.5 text-[11px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:hover:bg-sky-950 dark:text-sky-400 rounded-lg px-2.5 py-1.5 transition">
            <i class="fa-solid fa-images"></i> ${L('Photos', 'الصور')} (${count})
        </button>`;
    }

    // Opens the shared photo viewer modal (defined in CoolingArt.html as
    // #photoViewerModal) with the given task's 4 repair photo slots. Tapping a
    // thumbnail zooms it in place (renderPhotoZoom) — no more opening the raw
    // data URL in a new tab, which some browsers just showed as a blank page.
    let photoViewerCurrentTaskId = null;

    function openPhotoViewerModal(taskId) {
        photoViewerCurrentTaskId = taskId;
        renderPhotoViewerGrid(taskId);
        const modal = document.getElementById('photoViewerModal');
        if (modal) modal.classList.remove('hidden');
    }

    function renderPhotoViewerGrid(taskId) {
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;
        const photos = task.repairPhotos || {};
        const titleEl = document.getElementById('photoViewerTitle');
        if (titleEl) titleEl.textContent = `${task.id} — ${task.title}`;
        const body = document.getElementById('photoViewerBody');
        if (body) {
            body.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            ${REPAIR_PHOTO_SLOTS.map(([key, lbl]) => photos[key] ? `
                <div class="space-y-1">
                    <button type="button" onclick="renderPhotoZoom('${key}')" class="block w-full">
                        ${repairPhotoImgHtml(taskId, key, 'w-full h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700 hover:opacity-90 transition bg-slate-100 dark:bg-slate-800', photos[key])}
                    </button>
                    <span class="block text-[10px] font-bold text-slate-400 text-center">${escapeHtml(L(lbl[0], lbl[1]))}</span>
                </div>` : '').join('')}
        </div>`;
        }
    }

    // Swaps the modal body to a single, large view of one photo, with a Back
    // link that restores the grid — the click stays inside the modal instead of
    // following a data: URL out to a new (often blank-looking) tab.
    function renderPhotoZoom(key) {
        const taskId = photoViewerCurrentTaskId;
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;
        const photos = task.repairPhotos || {};
        if (!photos[key]) return;
        const lbl = (REPAIR_PHOTO_SLOTS.find(([k]) => k === key) || [null, ['', '']])[1];
        const body = document.getElementById('photoViewerBody');
        if (body) {
            body.innerHTML = `
        <div class="space-y-3">
            <button type="button" onclick="renderPhotoViewerGrid('${taskId}')"
                class="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-500 hover:text-sky-600 hover:underline">
                <i class="fa-solid fa-arrow-left"></i> ${L('Back to all photos', 'الرجوع لكل الصور')}
            </button>
            ${repairPhotoImgHtml(taskId, key, 'w-full max-h-[65vh] object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950', photos[key])}
            <span class="block text-[11px] font-bold text-slate-400 text-center">${escapeHtml(L(lbl[0], lbl[1]))}</span>
        </div>`;
        }
    }

    function closePhotoViewerModal() {
        const modal = document.getElementById('photoViewerModal');
        if (modal) modal.classList.add('hidden');
        photoViewerCurrentTaskId = null;
    }

    // The 4 upload slots shown WHILE the job is still In Progress — filled in
    // right after the money is collected, and required before "Mark as Done"
    // will go through. Not shown for the withdraw/workshop phases, which are
    // in-between handoff steps that don't collect money or close out the repair.
    function renderRepairPhotosInput(task) {
        if (task.orderType !== 'Tech Fix Service') return '';
        const phase = getTaskPhase(task);
        if (phase === 'withdraw' || phase === 'workshop') return '';
        const photos = task.repairPhotos || {};
        return `
    <div class="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-2">
        <span class="block text-[10px] font-extrabold uppercase text-slate-500"><i class="fa-solid fa-camera me-1"></i>${L('Add the 4 repair photos (required before Done)', 'أضف صور الصيانة الأربع (مطلوبة قبل الإنجاز)')}</span>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[10px]">
            ${REPAIR_PHOTO_SLOTS.map(([key, lbl]) => `
                <div class="space-y-1.5 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span class="block font-bold text-slate-600 dark:text-slate-300 truncate">${escapeHtml(L(lbl[0], lbl[1]))}</span>
                    ${photos[key] ? repairPhotoImgHtml(task.id, key, 'w-full h-16 object-cover rounded-lg border border-emerald-300 dark:border-emerald-700 mb-1 bg-slate-100 dark:bg-slate-800', photos[key]) : ''}
                    <div class="flex flex-col sm:flex-row gap-1.5 pt-1">
                        <label class="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold py-2 px-2.5 rounded-xl text-xs transition shadow-sm hover:scale-[1.02] active:scale-[0.98]">
                            <i class="fa-solid fa-folder-open text-xs"></i> ${L('Upload Photo', 'رفع صورة')}
                            <input type="file" accept="image/*" id="rp-up-${task.id}-${key}" onchange="previewRepairPhoto('${task.id}', '${key}', this)" class="hidden">
                        </label>
                        <label class="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-2 px-2.5 rounded-xl text-xs transition shadow-sm hover:scale-[1.02] active:scale-[0.98]">
                            <i class="fa-solid fa-camera text-xs"></i> ${L('Take Photo', 'التقاط صورة')}
                            <input type="file" accept="image/*" capture="environment" id="rp-cam-${task.id}-${key}" onchange="previewRepairPhoto('${task.id}', '${key}', this)" class="hidden">
                        </label>
                    </div>
                </div>`).join('')}
        </div>
    </div>`;
    }

    function previewRepairPhoto(taskId, key, input) {
        const file = input.files && input.files[0];
        if (!file) return;
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;
        readImageFileAsDataUrl(file, 1000, 0.8).then(dataUrl => {
            repairPhotoCache[repairPhotoDbKey(taskId, key)] = dataUrl;
            task.repairPhotos = Object.assign({}, task.repairPhotos, { [key]: true });
            saveState(); // tiny now — just a flag — so this won't hit the localStorage quota
            const current = getCurrentViewId();
            if (current === 'tech-home') renderTechHome();
            else renderAdminDashboard();
            saveRepairPhotoToDb(taskId, key, dataUrl).catch(() => {
                showToast(L('Photo shown for this session, but could not be stored permanently on this device.', 'تم عرض الصورة لهذه الجلسة، لكن تعذر تخزينها بشكل دائم على هذا الجهاز.'), 'error');
            });
        }).catch(() => {
            showToast(L('Please choose an image file.', 'يرجى اختيار ملف صورة.'), 'error');
        });
    }

    // Collects the 4 repair photos already picked on the task (via
    // previewRepairPhoto) and reports which ones, if any, are still missing.
    function getMissingRepairPhotoLabels(task) {
        const photos = task.repairPhotos || {};
        return REPAIR_PHOTO_SLOTS.filter(([key]) => !photos[key]).map(([, lbl]) => L(lbl[0], lbl[1]));
    }

    // ================= TECHNICIAN HOME (ACTIVE TASKS) =================
    // A lightweight "Home" for technicians — just what's on their plate right
    // now (Open + In Progress), so they don't have to wade through history to
    // see today's work.
    function renderTechHome() {
        state.tasks = JSON.parse(localStorage.getItem('ca_tasks')) || state.tasks;
        state.orders = JSON.parse(localStorage.getItem('ca_orders')) || state.orders;

        if (!state.currentUser || state.currentUser.role !== 'technician') return;

        const greeting = document.getElementById('techHomeGreeting');
        if (greeting) greeting.textContent = `Welcome back, ${state.currentUser.name || state.currentUser.username}`;

        const dateBox = document.getElementById('techHomeDate');
        if (dateBox) {
            dateBox.innerHTML = `<i class="fa-solid fa-calendar-day mr-1.5"></i>${new Date().toLocaleDateString(state.currentLang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
        }

        const myTasks = state.tasks.filter(t => t.assignedTo === state.currentUser.username);
        const openCount = myTasks.filter(t => t.status === 'Open').length;
        const progressCount = myTasks.filter(t => t.status === 'In Progress').length;
        const activeTasks = myTasks.filter(t => t.status === 'Open' || t.status === 'In Progress');

        const statsGrid = document.getElementById('techHomeStatsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-xl shrink-0"><i class="fa-solid fa-bolt"></i></div>
                <div>
                    <span class="text-xs font-bold text-slate-400 uppercase">Active Right Now</span>
                    <h3 class="text-2xl font-extrabold mt-0.5">${activeTasks.length}</h3>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-500 flex items-center justify-center text-xl shrink-0"><i class="fa-solid fa-hourglass-half"></i></div>
                <div>
                    <span class="text-xs font-bold text-slate-400 uppercase">Open</span>
                    <h3 class="text-2xl font-extrabold text-amber-500 mt-0.5">${openCount}</h3>
                </div>
            </div>
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-500 flex items-center justify-center text-xl shrink-0"><i class="fa-solid fa-screwdriver-wrench"></i></div>
                <div>
                    <span class="text-xs font-bold text-slate-400 uppercase">In Progress</span>
                    <h3 class="text-2xl font-extrabold text-sky-500 mt-0.5">${progressCount}</h3>
                </div>
            </div>
        `;
        }

        const grid = document.getElementById('techHomeTaskGrid');
        if (grid) {
            // Oldest first — whatever's been waiting longest surfaces at the top of its lane.
            const byOldest = (a, b) => (getTaskWaitingSince(a) || new Date(a.createdDate || 0)) - (getTaskWaitingSince(b) || new Date(b.createdDate || 0));
            // Most-recently-accepted first — so the task a technician just accepted
            // stays pinned at the top of "In Progress" instead of sinking under
            // older jobs, making it easy to find again.
            const byMostRecentlyAccepted = (a, b) => new Date(b.acceptedAt || b.assignedAt || b.createdDate || 0) - new Date(a.acceptedAt || a.assignedAt || a.createdDate || 0);
            const openSorted = myTasks.filter(t => t.status === 'Open').sort(byOldest);
            const progressSorted = myTasks.filter(t => t.status === 'In Progress').sort(byMostRecentlyAccepted);

            if (openSorted.length === 0 && progressSorted.length === 0) {
                grid.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div class="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-slate-800 text-sky-400 flex items-center justify-center text-2xl mb-4">
                        <i class="fa-solid fa-mug-hot"></i>
                    </div>
                    <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300">Nothing on your plate</h3>
                    <p class="text-xs text-slate-400 mt-1">You have no open or in-progress tasks right now.</p>
                </div>
            `;
            } else {
                const lane = (label, icon, colorClass, tasks) => tasks.length ? `
                <div class="flex items-center gap-2 mt-2 first:mt-0">
                    <i class="fa-solid ${icon} ${colorClass} text-xs"></i>
                    <h4 class="text-[11px] font-extrabold uppercase tracking-wide ${colorClass}">${label}</h4>
                    <span class="text-[10px] font-bold text-slate-400">(${tasks.length})</span>
                </div>
                ${tasks.map(task => renderTechTaskCard(task)).join('')}
            ` : '';
                grid.innerHTML =
                    lane(L('Needs Your Action', 'بحاجة لإجراء منك'), 'fa-hourglass-half', 'text-amber-500', openSorted) +
                    lane(L('In Progress', 'قيد التنفيذ'), 'fa-screwdriver-wrench', 'text-sky-500', progressSorted);
            }
        }
    }

    // ================= TECHNICIAN DASHBOARD (COMPLETED TASK LOG) =================
    // A separate, history-first "Dashboard" for technicians — a chronological
    // record of tasks they've already finished, distinct from Home (which only
    // shows what's still active).
    function renderTechDashboard() {
        state.tasks = JSON.parse(localStorage.getItem('ca_tasks')) || state.tasks;
        state.orders = JSON.parse(localStorage.getItem('ca_orders')) || state.orders;

        if (!state.currentUser || state.currentUser.role !== 'technician') return;

        const greeting = document.getElementById('techDashGreeting');
        if (greeting) greeting.textContent = `Task Log — ${state.currentUser.name || state.currentUser.username}`;

        const dateBox = document.getElementById('techDashDate');
        if (dateBox) {
            dateBox.innerHTML = `<i class="fa-solid fa-calendar-day mr-1.5"></i>${new Date().toLocaleDateString(state.currentLang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
        }

        const myTasks = state.tasks.filter(t => t.assignedTo === state.currentUser.username);
        const completedTasks = myTasks.filter(t => t.status === 'Done');

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const completedThisWeek = completedTasks.filter(t => { const d = getTaskCompletionDate(t); return d && d >= startOfWeek; }).length;
        const completedThisMonth = completedTasks.filter(t => { const d = getTaskCompletionDate(t); return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;

        const statsGrid = document.getElementById('techStatsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span class="text-xs font-bold text-slate-400 uppercase">Total Completed</span>
                <h3 class="text-2xl font-extrabold text-emerald-500 mt-1">${completedTasks.length}</h3>
            </div>
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span class="text-xs font-bold text-slate-400 uppercase">Completed This Week</span>
                <h3 class="text-2xl font-extrabold mt-1">${completedThisWeek}</h3>
            </div>
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span class="text-xs font-bold text-slate-400 uppercase">Completed This Month</span>
                <h3 class="text-2xl font-extrabold mt-1">${completedThisMonth}</h3>
            </div>
        `;
        }

        // Sorted chronologically, most recently completed first — a log, not a
        // to-do list, so no filter tabs and no way to flip status from here.
        const sorted = [...completedTasks].sort((a, b) => (getTaskCompletionDate(b) || new Date(b.createdDate)) - (getTaskCompletionDate(a) || new Date(a.createdDate)));

        const grid = document.getElementById('techTaskGrid');
        if (grid) {
            if (sorted.length === 0) {
                grid.innerHTML = `
                <div class="md:col-span-2 flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                    <div class="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-slate-800 text-sky-400 flex items-center justify-center text-2xl mb-4">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>
                    <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300">No completed tasks yet</h3>
                    <p class="text-xs text-slate-400 mt-1">Tasks you mark "Done" from Home will show up here as a record of your work.</p>
                </div>
            `;
            } else {
                grid.innerHTML = sorted.map(task => renderTechLogEntry(task)).join('');
            }
        }
    }

    // A read-only log row for a completed task — no status control, since the
    // log is a record of past work rather than something to action.
    function renderTechLogEntry(task) {
        const priorityBadgeStyle = {
            Urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
            High: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
            Normal: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400'
        };
        const badgeStyle = priorityBadgeStyle[task.priority] || priorityBadgeStyle.Normal;

        // Once the customer has sent feedback the job can't be reopened.
        const order = task.orderId ? state.orders.find(o => o.id === task.orderId) : null;
        const locked = !!(order && order.customerFeedback);
        const undoArea = task.handedOff
            ? `<span class="text-xs font-bold text-slate-400"><i class="fa-solid fa-share"></i> ${L('Sent to', 'تم التحويل إلى')}: ${escapeHtml(getPhaseLabel(task.handedOffTo))}</span>`
            : locked
                ? `<span class="text-xs font-bold text-slate-400"><i class="fa-solid fa-lock"></i> ${L('Customer feedback received', 'تم استلام تقييم العميل')}</span>`
                : `<button onclick="updateTaskStatus('${task.id}', 'In Progress')"
                class="text-xs font-extrabold bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 dark:bg-slate-800 dark:hover:bg-amber-950 dark:text-slate-200 rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-1.5 min-h-[40px]">
                <i class="fa-solid fa-rotate-left"></i> ${L('Undo Done', 'تراجع عن الإنجاز')}
            </button>`;

        return `
        <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500 p-5 space-y-3 shadow-sm">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <span class="text-[10px] font-mono text-slate-400">${task.id}</span>
                    <h3 class="font-bold text-sm mt-0.5">${escapeHtml(task.title)}</h3>
                </div>
                <span class="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shrink-0 ${badgeStyle}">${task.priority}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">${escapeHtml(task.description)}</p>
            ${renderReceivedLine(task)}
            <div class="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800">
                <span class="text-[11px] text-emerald-500 font-bold flex items-center gap-1.5">
                    <i class="fa-solid fa-circle-check"></i> Completed ${escapeHtml(formatDateTime(task.completedAt || task.completedDate))}
                </span>
                <div class="flex items-center gap-2">
                    ${renderRepairPhotosIcon(task)}
                    ${undoArea}
                    <span class="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">Done</span>
                </div>
            </div>
        </div>
    `;
    }

    // Customer location box on a technician's task card: area name plus GPS pin.
    function renderTechLocationBox(task) {
        const loc = getTaskLocation(task);
        if (!loc.label && !loc.coords) return '';
        const areaText = loc.label ? escapeHtml(getLocationLabel(loc.label)) : L('Customer location', 'موقع العميل');
        const pinPart = loc.coords ? `
        <div class="flex flex-wrap gap-2 pt-1">
            <a href="https://www.google.com/maps/dir/?api=1&amp;destination=${loc.coords.lat},${loc.coords.lng}" target="_blank" rel="noopener noreferrer"
                class="text-xs font-extrabold bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-1.5 min-h-[40px]">
                <i class="fa-solid fa-diamond-turn-right me-1"></i>${L('Navigate', 'ابدأ الملاحة')}
            </a>
            <a href="${buildMapsUrl(loc.coords)}" target="_blank" rel="noopener noreferrer"
                class="text-xs font-extrabold bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-300 rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-1.5 min-h-[40px]">
                <i class="fa-solid fa-location-dot me-1"></i>${L('Open in Maps', 'فتح الخريطة')}
            </a>
        </div>
    ` : `<p class="text-[11px] text-slate-400">${L('The customer did not share a GPS pin for this job.', 'لم يشارك العميل موقع GPS لهذه المهمة.')}</p>`;

        return `
        <div class="rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900 p-3 space-y-2">
            <div class="flex items-center gap-2 text-xs font-bold text-sky-700 dark:text-sky-300">
                <i class="fa-solid fa-location-dot"></i><span>${areaText}</span>
            </div>
            ${pinPart}
        </div>
    `;
    }

    function renderTechTaskCard(task) {
        const priorityCardStyle = {
            Urgent: 'border-l-red-500',
            High: 'border-l-amber-500',
            Normal: 'border-l-sky-500'
        };
        const priorityBadgeStyle = {
            Urgent: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
            High: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
            Normal: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400'
        };
        const cardBorder = priorityCardStyle[task.priority] || priorityCardStyle.Normal;
        const badgeStyle = priorityBadgeStyle[task.priority] || priorityBadgeStyle.Normal;
        const isDone = task.status === 'Done';
        const isRepair = task.orderType === 'Tech Fix Service';

        // Money received from the customer — entered while the job is in progress
        // and saved when the technician taps "Mark as Done".
        const phase = getTaskPhase(task);
        const moneyBlock = (task.status === 'In Progress' && isRepair && phase !== 'withdraw' && phase !== 'workshop') ? `
        <div class="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 p-3 space-y-1.5">
            <label for="amount-${task.id}" class="block text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400">
                ${L('Money received from customer (EGP) *', 'المبلغ المستلم من العميل (جنيه) *')}
            </label>
            <input type="number" min="0" step="any" inputmode="decimal" id="amount-${task.id}" value="${task.amountReceived ?? ''}"
                placeholder="${L('Required — enter 0 if nothing was paid', 'مطلوب — اكتب 0 إذا لم يتم الدفع')}"
                class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <label class="block text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 pt-1.5">${L('Payment method', 'طريقة الدفع')}</label>
            <select id="paymethod-${task.id}" class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                ${['Cash', 'InstaPay', 'Vodafone Cash'].map(m => `<option value="${m}" ${(task.paymentMethod || 'Cash') === m ? 'selected' : ''}>${m === 'Cash' ? L('Cash', 'نقدي') : m}</option>`).join('')}
            </select>
        </div>
    ` : '';

        return `
        <div class="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 ${cardBorder} p-5 space-y-3 shadow-sm ${isDone ? 'opacity-70' : ''}">
            <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                    <span class="text-[10px] font-mono text-slate-400">${task.id}</span>
                    ${!isDone ? `<span class="text-[10px] text-slate-400"> · <i class="fa-regular fa-clock"></i> ${formatElapsed(getTaskWaitingSince(task))}</span>` : ''}
                    <h3 class="font-bold text-sm mt-0.5 ${isDone ? 'line-through text-slate-400' : ''}">${escapeHtml(task.title)}</h3>
                    ${phase !== 'unit' ? `<span class="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">${escapeHtml(getPhaseLabel(phase))}</span>` : ''}
                </div>
                <span class="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shrink-0 ${badgeStyle}">${task.priority}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">${escapeHtml(task.description)}</p>
            ${renderTechLocationBox(task)}
            ${moneyBlock}
            ${task.status === 'In Progress' ? renderRepairPhotosInput(task) : ''}
            <div class="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800">
                <span class="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <i class="fa-regular fa-calendar"></i> ${task.dueDate || 'No due date'}
                </span>
                ${task.status === 'Open' ? `
                    <div class="flex items-center gap-2">
                        <button onclick="declineTask('${task.id}')"
                            class="text-xs font-extrabold bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 dark:bg-slate-800 dark:hover:bg-red-950 dark:text-slate-300 rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2 min-h-[42px]">
                            Decline
                        </button>
                        <button onclick="updateTaskStatus('${task.id}', 'In Progress')"
                            class="text-xs font-extrabold bg-sky-500 hover:bg-sky-600 text-white rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2 min-h-[42px]">
                            Accept Task
                        </button>
                    </div>
                ` : task.status === 'In Progress' ? `
                    <div class="flex items-center justify-end gap-2.5 flex-wrap">
                        <button onclick="updateTaskStatus('${task.id}', 'Open')"
                            class="text-xs font-extrabold bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 dark:bg-slate-800 dark:hover:bg-amber-950 dark:text-slate-300 rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2 min-h-[42px]">
                            <i class="fa-solid fa-rotate-left"></i> ${L('Undo Accept', 'تراجع عن القبول')}
                        </button>
                        ${(PHASE_NEXT[phase] || []).includes('replace') ? `
                        <button onclick="handOffTask('${task.id}', 'replace')"
                            class="text-xs font-extrabold bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2 min-h-[42px]">
                            <i class="fa-solid fa-gears"></i> ${L('Needs Piece', 'يحتاج قطعة')}
                        </button>` : ''}
                        ${(PHASE_NEXT[phase] || []).includes('withdraw') ? `
                        <button onclick="handOffTask('${task.id}', 'withdraw')"
                            class="text-xs font-extrabold bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-950 dark:hover:bg-amber-900 dark:text-amber-300 rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2 min-h-[42px]">
                            <i class="fa-solid fa-truck-ramp-box"></i> ${L('Need to Withdraw', 'بحاجة للسحب')}
                        </button>` : ''}
                        ${(PHASE_NEXT[phase] || []).includes('workshop') ? `
                        <button onclick="handOffTask('${task.id}', 'workshop')"
                            class="text-xs font-extrabold bg-violet-100 hover:bg-violet-200 text-violet-700 dark:bg-violet-950 dark:hover:bg-violet-900 dark:text-violet-300 rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2 min-h-[42px]">
                            <i class="fa-solid fa-industry"></i> ${L('Withdrawn – Fix in Workshop', 'تم السحب – إصلاح في الورشة')}
                        </button>` : ''}
                        ${(PHASE_NEXT[phase] || []).includes('return') ? `
                        <button onclick="handOffTask('${task.id}', 'return')"
                            class="text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2 min-h-[42px]">
                            <i class="fa-solid fa-truck-fast"></i> ${L('Fixed – Send Back', 'تم الإصلاح – إرجاع للعميل')}
                        </button>` : ''}
                        ${(phase === 'repair' || (PHASE_NEXT[phase] || []).length === 0) ? `
                        <button onclick="markTaskDone('${task.id}')"
                            class="text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2.5 transition shadow-sm hover:scale-[1.02] active:scale-[0.98] inline-flex items-center justify-center gap-2 min-h-[42px]">
                            <i class="fa-solid fa-circle-check"></i> Mark as Done
                        </button>` : ''}
                    </div>
                ` : `
                    <span class="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">Done</span>
                `}
            </div>
        </div>
    `;
    }

    // Fills the Position dropdown to match the chosen Category. The Executive Director
    // (Admin only) has no sub-position, so the dropdown is hidden for it.
    function updateStaffPositionOptions() {
        const cat = document.getElementById('staffCategory');
        const pos = document.getElementById('staffPosition');
        const wrap = document.getElementById('staffPositionWrap');
        if (!cat || !pos || !wrap) return;
        const def = STAFF_CATEGORIES[cat.value];
        if (!def) {
            wrap.classList.add('hidden');
            pos.required = false;
            pos.innerHTML = '';
            return;
        }
        wrap.classList.remove('hidden');
        pos.required = true;
        pos.innerHTML = def.positions
            .map(p => `<option value="${p.key}">${state.currentLang === 'ar' ? p.ar : p.en}</option>`)
            .join('');
    }

    function openStaffAccountModal() {
        const modal = document.getElementById('staffAccountModal');
        if (modal) modal.classList.remove('hidden');
    }

    function closeStaffAccountModal() {
        const modal = document.getElementById('staffAccountModal');
        if (modal) modal.classList.add('hidden');
    }

    // Holds the base64 data URL of the photo picked in the Create Staff Account form,
    // set by previewStaffPhoto() and consumed/cleared by handleCreateStaffSubmit().
    let pendingStaffPhotoDataUrl = null;

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Reads an image file picked from the device, downsizes it on a canvas, and
    // resolves to a compact base64 data URL — same approach as the home gallery
    // upload, reused anywhere an admin picks a product/service/etc. image locally.
    function readImageFileAsDataUrl(file, maxDim = 1000, quality = 0.82) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type || !file.type.startsWith('image/')) { reject(new Error('not-image')); return; }
            const reader = new FileReader();
            reader.onload = ev => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width, h = img.height;
                    if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = ev.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Generic "pick an image from disk, preview it, and hold the compressed data
    // URL until the form is submitted" wiring — used by every image field that
    // used to be a plain URL text input.
    function makeImagePickHandler(setPending, previewElId) {
        return function (event) {
            const file = event.target.files && event.target.files[0];
            event.target.value = '';
            if (!file) return;
            readImageFileAsDataUrl(file).then(dataUrl => {
                setPending(dataUrl);
                const preview = document.getElementById(previewElId);
                if (preview) preview.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-cover" alt="Preview">`;
            }).catch(() => {
                showToast(L('Please choose an image file.', 'يرجى اختيار ملف صورة.'), 'error');
            });
        };
    }

    const IMAGE_PICK_INPUT_CLS = "flex-1 text-[11px] file:me-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:font-bold file:bg-sky-100 file:text-sky-600 dark:file:bg-sky-950 dark:file:text-sky-400 hover:file:bg-sky-200";
    function imagePickFieldHtml(fileInputId, previewElId, onchangeFn, existingUrl) {
        return `
        <div class="md:col-span-2">
            <label class="block font-bold uppercase text-slate-500 mb-1 text-[10px]">${L('Image (optional)', 'صورة (اختياري)')}</label>
            <div class="flex items-center gap-3">
                <div id="${previewElId}" class="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-300 dark:text-slate-600 shrink-0 overflow-hidden">
                    ${existingUrl ? `<img src="${escapeHtml(existingUrl)}" class="w-full h-full object-cover" alt="Preview">` : `<i class="fa-solid fa-image"></i>`}
                </div>
                <input type="file" id="${fileInputId}" accept="image/*" onchange="${onchangeFn}(event)" class="${IMAGE_PICK_INPUT_CLS}">
            </div>
        </div>`;
    }

    async function previewStaffPhoto(event) {
        const file = event.target.files && event.target.files[0];
        const preview = document.getElementById('staffPhotoPreview');
        if (!file) return;
        if (file.size > 1024 * 1024) {
            showToast('Photo must be under 1 MB.', 'error');
            event.target.value = '';
            return;
        }
        const dataUrl = await readFileAsDataUrl(file);
        pendingStaffPhotoDataUrl = dataUrl;
        if (preview) preview.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-cover" alt="Preview">`;
    }

    async function handleCreateStaffSubmit(e) {
        e.preventDefault();

        if (!state.currentUser || !isTopAdmin(state.currentUser.role)) {
            showToast('Only the Admin or the Executive Director can add employees.', 'error');
            return;
        }

        const name = document.getElementById('staffFullName').value.trim();
        const category = document.getElementById('staffCategory').value;
        const positionEl = document.getElementById('staffPosition');
        const positionKey = positionEl ? positionEl.value : '';
        const username = document.getElementById('staffUsername').value.trim();
        const password = document.getElementById('staffPassword').value;
        const whatsapp = document.getElementById('staffWhatsApp').value.trim();
        const contactPhone = document.getElementById('staffContactPhone').value.trim();

        // Work out the permission role + job title from the chosen category / position
        let role = null;
        let position = null;
        if (category === 'executive') {
            if (state.currentUser.role !== 'head-admin') {
                showToast('Only the Admin can add or delete an Executive Director.', 'error');
                return;
            }
            role = 'executive';
            position = 'executive-director';
        } else {
            const catDef = STAFF_CATEGORIES[category];
            const posDef = catDef && catDef.positions.find(p => p.key === positionKey);
            if (!catDef || !posDef) {
                showToast('Please select a valid staff role.', 'error');
                return;
            }
            role = catDef.role;
            position = posDef.key;
        }

        if (!name || !username || !password) {
            showToast('Please complete the staff account form.', 'error');
            return;
        }

        const phoneRegex = /^\d{11}$/;
        if (whatsapp && !phoneRegex.test(whatsapp)) {
            showToast('WhatsApp number must be exactly 11 digits.', 'error');
            return;
        }
        if (contactPhone && !phoneRegex.test(contactPhone)) {
            showToast('Contact number must be exactly 11 digits.', 'error');
            return;
        }
        if (state.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            showToast('That username is already taken.', 'error');
            return;
        }

        // Register staff account in Supabase using internal mapped email
        if (supabaseClient) {
            try {
                const dummyEmail = getSupabaseEmail(username);
                const { data, error } = await supabaseClient.auth.signUp({
                    email: dummyEmail,
                    password: password,
                    options: {
                        data: {
                            username: username,
                            name: name || username,
                            whatsapp: whatsapp,
                            contactPhone: contactPhone,
                            role: role,
                            position: position
                        }
                    }
                });
                if (error) {
                    console.warn('[Supabase Auth] Staff SignUp notice/warning:', error.message);
                } else {
                    console.log('[Supabase Auth] Staff registered successfully with internal email:', dummyEmail);
                }
            } catch (sbErr) {
                console.warn('[Supabase Auth] Exception during staff signup:', sbErr);
            }
        }

        const newStaff = {
            id: createDateBasedId('USR'),
            username,
            password: await hashPassword(password),
            role,
            position,
            name,
            whatsapp,
            contactPhone,
            photo: pendingStaffPhotoDataUrl || null,
            joinedDate: getLocalDateString()
        };

        state.users.push(newStaff);
        saveState();
        showToast(`${getPositionLabel(newStaff)} account created for ${name}.`, 'success');

        pendingStaffPhotoDataUrl = null;
        e.target.reset();
        const preview = document.getElementById('staffPhotoPreview');
        if (preview) preview.innerHTML = '<i class="fa-solid fa-user text-2xl"></i>';
        renderAdminDashboard();
        closeStaffAccountModal();
    }

    function reassignTask(taskId, newAssignee) {
        const isTaskManager = state.currentUser && (isTopAdmin(state.currentUser.role) || state.currentUser.role === 'hr');
        if (!isTaskManager) {
            showToast('Only the head admin or Customer Services can reassign tasks.', 'error');
            renderAdminDashboard();
            return;
        }

        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;

        if (task.status === 'Done') {
            showToast('This task is already Done — the assigned technician can no longer be changed.', 'error');
            renderAdminDashboard();
            return;
        }

        const newTech = state.users.find(u => u.username === newAssignee && u.role === 'technician');
        if (!newTech) {
            showToast('Please choose a valid technician to reassign to.', 'error');
            renderAdminDashboard();
            return;
        }

        const previousAssignee = task.assignedTo;
        task.assignedTo = newAssignee;
        task.assignedAt = new Date().toISOString(); // starts the 4-hour "late" clock for this assignment
        saveState();
        if (!previousAssignee) {
            showToast(`Task assigned to @${newAssignee}.`, 'success');
        } else {
            showToast(`Task withdrawn from @${previousAssignee} and reassigned to @${newAssignee}.`, 'success');
        }
        renderAdminDashboard();
    }

    // Marks the task Done. Repair jobs must have the "money received" amount
    // (0 is fine) AND all 4 repair photos (Compressor + its Serial/Model,
    // Fan + its Serial/Model) attached first; unit orders collect no money on
    // site and carry no repair photos, so they just finish.
    function markTaskDone(taskId) {
        const task = state.tasks.find(item => item.id === taskId);
        if (!task) return;

        if (task.orderType !== 'Tech Fix Service') {
            updateTaskStatus(taskId, 'Done');
            return;
        }

        if (getTaskPhase(task) !== 'withdraw') {
            const input = document.getElementById(`amount-${taskId}`);
            const raw = input ? input.value.trim() : '';

            if (raw === '') {
                showToast(L('Enter the money received from the customer first (0 if nothing was paid).', 'اكتب المبلغ المستلم من العميل أولاً (0 إذا لم يتم الدفع).'), 'error');
                if (input) input.focus();
                return;
            }

            const amount = Number(raw);
            if (isNaN(amount) || amount < 0) {
                showToast(L('Please enter a valid amount.', 'يرجى إدخال مبلغ صحيح.'), 'error');
                if (input) input.focus();
                return;
            }

            const missing = getMissingRepairPhotoLabels(task);
            if (missing.length) {
                showToast(L(`Please add all 4 repair photos first. Missing: ${missing.join(', ')}`, `يرجى إضافة صور الصيانة الأربع أولاً. الناقص: ${missing.join(', ')}`), 'error');
                return;
            }

            const methodEl = document.getElementById(`paymethod-${taskId}`);
            const paymentMethod = methodEl ? methodEl.value : (task.paymentMethod || 'Cash');
            updateTaskStatus(taskId, 'Done', amount, paymentMethod);
            return;
        }

        updateTaskStatus(taskId, 'Done');
    }

    // Moves a task between Open -> In Progress -> Done. Going one step back
    // (In Progress -> Open, Done -> In Progress) is the "undo" for a wrong tap.
    function updateTaskStatus(taskId, newStatus, amountReceived, paymentMethod) {
        state.tasks = JSON.parse(localStorage.getItem('ca_tasks')) || state.tasks;
        state.orders = JSON.parse(localStorage.getItem('ca_orders')) || state.orders;

        const task = state.tasks.find(item => item.id === taskId);
        if (!task) return;

        const isTaskManager = state.currentUser && (isTopAdmin(state.currentUser.role) || state.currentUser.role === 'hr');
        if (!isTaskManager && task.assignedTo !== state.currentUser.username) {
            showToast('You can only update your own assigned tasks.', 'error');
            renderAdminDashboard();
            return;
        }

        const allowedMoves = { 'Open': ['In Progress'], 'In Progress': ['Open', 'Done'], 'Done': ['In Progress'] };
        const previousStatus = task.status;
        if (!(allowedMoves[previousStatus] || []).includes(newStatus)) {
            showToast(`Task ${taskId} can't move from ${previousStatus} to ${newStatus}.`, 'error');
            return;
        }

        const linkedOrder = task.orderId ? state.orders.find(o => o.id === task.orderId) : null;

        if (previousStatus === 'Done' && task.handedOff) {
            showToast(L('This step was already handed to a new task, so it can no longer be reopened.', 'تم تحويل هذه الخطوة إلى مهمة جديدة، لذلك لا يمكن إعادة فتحها.'), 'error');
            return;
        }

        // Once the customer has rated the job it really was finished, so it stays Done.
        if (previousStatus === 'Done' && linkedOrder && linkedOrder.customerFeedback) {
            showToast(L('The customer already sent feedback for this job, so it can no longer be reopened.', 'أرسل العميل تقييمه لهذه المهمة، لذلك لا يمكن إعادة فتحها.'), 'error');
            return;
        }

        task.status = newStatus;
        if (newStatus === 'In Progress' && previousStatus === 'Open') {
            // Marks the moment the technician accepted it, so Home can float the
            // just-accepted task to the top of "In Progress" instead of sorting
            // it by how long it had been waiting before that.
            task.acceptedAt = new Date().toISOString();
        }
        if (newStatus === 'Done') {
            // Record the exact moment (date AND time) the task was marked Done.
            const doneNow = new Date();
            task.completedAt = doneNow.toISOString();
            task.completedDate = getLocalDateString(doneNow);
            if (amountReceived !== undefined) task.amountReceived = Number(amountReceived) || 0;
            if (paymentMethod) task.paymentMethod = paymentMethod;
        } else {
            task.completedAt = null;
            task.completedDate = null;
        }

        // Keep the linked order's status in sync with the task, so the customer
        // (My Orders) and the admin (Global Orders table) both see the same
        // real-time status: accepted -> "In Progress", finished -> "Delivered",
        // and back to the starting status if the technician undoes the accept.
        if (linkedOrder) {
            linkedOrder.status = getOrderStatusForTask(task, newStatus);
            if (newStatus === 'Done') linkedOrder.completedAt = task.completedAt;
            else delete linkedOrder.completedAt;
        }

        saveState();
        const isUndo = (previousStatus === 'In Progress' && newStatus === 'Open') || (previousStatus === 'Done' && newStatus === 'In Progress');
        showToast(isUndo ? `Undone — task ${taskId} is back to ${newStatus}` : `Task ${taskId} updated to ${newStatus}`, 'success');
        const current = getCurrentViewId();
        if (current === 'tech-home') renderTechHome();
        else if (current === 'tech-dashboard') renderTechDashboard();
        else renderAdminDashboard();
    }

    // Technician closes their step and sends the job on: repair -> replace / withdraw,
    // withdraw -> return. Pops a NEW unassigned task on the board for admin/Customer Services.
    // The customer keeps seeing "In Progress" (or "On The Way" for the return leg).
    function handOffTask(taskId, nextPhase) {
        state.tasks = JSON.parse(localStorage.getItem('ca_tasks')) || state.tasks;
        state.orders = JSON.parse(localStorage.getItem('ca_orders')) || state.orders;

        const task = state.tasks.find(item => item.id === taskId);
        if (!task || !state.currentUser) return;

        const isTaskManager = isTopAdmin(state.currentUser.role) || state.currentUser.role === 'hr';
        if (!isTaskManager && task.assignedTo !== state.currentUser.username) {
            showToast('You can only update your own assigned tasks.', 'error');
            return;
        }
        if (task.status !== 'In Progress') {
            showToast(L('Accept the task first.', 'اقبل المهمة أولاً.'), 'error');
            return;
        }
        if (!(PHASE_NEXT[getTaskPhase(task)] || []).includes(nextPhase)) {
            showToast(L('That step is not available from here.', 'هذه الخطوة غير متاحة من هنا.'), 'error');
            return;
        }

        let note = '';
        if (nextPhase === 'replace') {
            const answer = window.prompt(L('Which piece is needed? (optional)', 'ما القطعة المطلوبة؟ (اختياري)'), '');
            if (answer === null) return;
            note = answer.trim();
        }

        const order = task.orderId ? state.orders.find(o => o.id === task.orderId) : null;
        const now = new Date();

        // Close this step (kept as history, but hidden from the board).
        task.status = 'Done';
        task.completedAt = now.toISOString();
        task.completedDate = getLocalDateString(now);
        task.handedOff = true;
        task.handedOffTo = nextPhase;

        const itemTitle = order ? order.itemTitle : task.title;
        // A withdrawal is handed over as a "Get It" job that continues as a
        // Repair On-Site task for (another) technician to pick up.
        const handoffTitle = `${getPhaseLabel(nextPhase)}: ${itemTitle}`;
        const next = {
            id: createDateBasedId('TSK'),
            title: handoffTitle,
            description: `${task.description}${note ? ` Part needed: ${note}.` : ''} Continues ${task.id}.`,
            assignedTo: '',
            createdBy: `Technician @${state.currentUser.username} (from ${task.id})`,
            createdDate: getLocalDateString(now),
            createdAt: now.toISOString(),
            unassignedSince: now.toISOString(),
            dueDate: '',
            priority: 'High',
            status: 'Open',
            orderId: task.orderId,
            orderType: task.orderType,
            phase: nextPhase,
            parentTaskId: task.id,
            locationCoords: task.locationCoords || null
        };
        state.tasks.unshift(next);

        if (order) {
            order.status = getOrderStatusForTask(next, 'Open');
            delete order.completedAt;
        }

        saveState();
        showToast(L(`New task created: ${getPhaseLabel(nextPhase)}. Waiting for assignment.`, `تم إنشاء مهمة جديدة: ${getPhaseLabel(nextPhase)}. بانتظار التعيين.`), 'success');

        const current = getCurrentViewId();
        if (current === 'tech-home') renderTechHome();
        else if (current === 'tech-dashboard') renderTechDashboard();
        else renderAdminDashboard();
    }

    // Lets a technician turn down a task that was assigned to them before they've
    // accepted it. The task is unassigned and stays "Open" so it reappears in the
    // admin/Customer Services Task Board's "Needs Assignment" queue for reassignment — it simply
    // disappears from this technician's own list since it's no longer theirs.
    function declineTask(taskId) {
        const task = state.tasks.find(item => item.id === taskId);
        if (!task) return;

        if (!state.currentUser || state.currentUser.role !== 'technician' || task.assignedTo !== state.currentUser.username) {
            showToast('You can only decline your own assigned tasks.', 'error');
            return;
        }
        if (task.status !== 'Open') {
            showToast('Only a task you have not yet accepted can be declined.', 'error');
            return;
        }

        task.assignedTo = null;
        task.unassignedSince = new Date().toISOString(); // the "late" clock restarts
        saveState();
        showToast(`Task ${taskId} declined. It has been sent back for reassignment.`, 'info');

        const current = getCurrentViewId();
        if (current === 'tech-home') renderTechHome();
        else renderAdminDashboard();
    }

    function updateOrderStatus(orderId, newStatus) {
        const o = state.orders.find(item => item.id === orderId);
        if (o) {
            o.status = newStatus;
            saveState();
            showToast(`Order ${orderId} updated to ${newStatus}`, 'success');
            renderAdminDashboard();
        }
    }

    function handleContactSubmit(e) {
        e.preventDefault();
        showToast('Thank you! Your message has been routed to Cooling Art support.', 'success');
        e.target.reset();
    }

    function getStatusBadge(status) {
        const STATUS_AR = { 'Completed': 'مكتمل', 'Active / Verified': 'نشط / موثق', 'Delivered': 'تم التسليم', 'In Progress': 'قيد التنفيذ', 'On The Way': 'في الطريق', 'Pending Dispatch': 'قيد الإرسال', 'Open': 'مفتوح', 'Done': 'منجز' };
        const label = (state.currentLang === 'ar' && STATUS_AR[status]) ? STATUS_AR[status] : status;
        if (status === 'Completed' || status === 'Active / Verified' || status === 'Delivered') {
            return `<span class="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">${label}</span>`;
        }
        if (status === 'In Progress' || status === 'On The Way') {
            return `<span class="bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">${label}</span>`;
        }
        return `<span class="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">${label}</span>`;
    }

    function showToast(msg, type = 'info', duration = 3500) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');

        let bg = 'bg-slate-900 text-white';
        if (type === 'success') bg = 'bg-sky-600 text-white shadow-sky-500/30';
        if (type === 'error') bg = 'bg-red-600 text-white';

        toast.className = `p-4 rounded-2xl shadow-xl text-xs font-bold ${bg} flex items-start gap-3 transition duration-300 max-w-xs pointer-events-auto`;
        toast.innerHTML = `<i class="fa-solid fa-snowflake mt-0.5 shrink-0"></i> <span>${msg}</span>`;

        container.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    function renderApp() {
        applyLanguage();
        renderAuthBox();
        renderHomeGallery();
        renderProducts();
        renderTechServices();
        renderPolicies();
        applyRoleBasedNav();
        applySiteRename();
    }

    // Shows/hides nav items based on the logged-in account's role
    function applyRoleBasedNav() {
        const homeNav = document.getElementById('nav-home');
        const productsNav = document.getElementById('nav-products');
        const techFixNav = document.getElementById('nav-tech-fix');
        const contactNav = document.getElementById('nav-contact');
        const dashNav = document.getElementById('nav-dashboard');
        const customerLogNav = document.getElementById('nav-customer-log');
        const chatsNav = document.getElementById('nav-chats');

        const role = state.currentUser ? state.currentUser.role : null;
        const isTechnician = role === 'technician';
        const isCustomerServices = role === 'hr';

        // Technicians get their own stripped-down nav: "Home" (their active
        // tasks — redirected transparently by navigateTo), "Dashboard" (their
        // completed-task log), Who Are We, and About & Policies. Everything
        // else — Products, Tech Fix, Contact, Customer Log, Chats — is hidden
        // for them. Head admin & Customer Services get Home/Products/Tech-Fix/
        // Contact as normal, plus Customer Log (and Chats for the support team);
        // the Dashboard nav link stays hidden since clicking their name
        // (top-right) already opens the dashboard.
        if (homeNav) homeNav.classList.remove('hidden');
        if (productsNav) productsNav.classList.toggle('hidden', isTechnician);
        if (techFixNav) techFixNav.classList.toggle('hidden', isTechnician || isCustomerServices);
        if (contactNav) contactNav.classList.toggle('hidden', isTechnician);
        if (dashNav) dashNav.classList.toggle('hidden', !isTechnician);
        if (customerLogNav) customerLogNav.classList.toggle('hidden', !isTopAdmin(role));
        if (chatsNav) chatsNav.classList.toggle('hidden', !(isTopAdmin(role) || isCustomerServices));
    }

    // Brand logo click: everyone goes "home" — navigateTo transparently sends
    // technicians to their active-tasks Home instead of the marketing page.
    function goBrandHome() {
        navigateTo('home');
    }

    function bootstrapCoolingArt() {
        if (window.__coolingArtBootstrapped) return;
        window.__coolingArtBootstrapped = true;
        setInterval(checkLateTasks, 10000);
        // Keeps Customer Services / Head Admin's "Customer Chats" list live so a new
        // chat request (or a customer's new message) shows up without a manual refresh.
        setInterval(() => {
            if (getCurrentViewId() === 'chats' && state.currentUser &&
                (isTopAdmin(state.currentUser.role) || state.currentUser.role === 'hr')) {
                renderAdminChats();
            }
        }, 5000);
        applyLanguage();
        renderApp();
        initContactBot();
        // Prefer the URL hash (works with browser back/forward), then fall back to the
        // last-visited view so a plain page refresh reopens where the person left off.
        const initialView = location.hash ? location.hash.replace('#', '') : (sessionStorage.getItem('ca_last_view') || 'home');
        navigateTo(initialView, true);
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', bootstrapCoolingArt);
    } else {
        bootstrapCoolingArt();
    }

    function openDeleteOrderModal(orderId, title) {
        if (!state.currentUser || !isTopAdmin(state.currentUser.role)) {
            showToast('Only the head admin can delete orders.', 'error');
            return;
        }

        orderToDeleteId = orderId;
        const modal = document.getElementById('deleteUserModal');
        const msg = document.getElementById('deleteUserModalMsg');
        if (msg) {
            msg.innerText = `Are you sure you want to delete order "${title}"?`;
        }
        modal.classList.remove('hidden');
    }

    function confirmDeleteOrder() {
        if (!orderToDeleteId) return;
        if (!state.currentUser || !isTopAdmin(state.currentUser.role)) {
            showToast('Only the head admin can delete orders.', 'error');
            closeDeleteUserModal();
            return;
        }

        purgeOrders(order => order.id === orderToDeleteId);
        saveState();
        orderToDeleteId = null;
        closeDeleteUserModal();
        showToast('Order successfully deleted!', 'success');
        renderAdminDashboard();
    }

    function confirmResetTotalRevenue() {
        if (!state.currentUser || !isTopAdmin(state.currentUser.role)) {
            showToast('Only the head admin can reset revenue.', 'error');
            return;
        }
        document.getElementById('revenueResetModal').classList.remove('hidden');
    }

    function closeRevenueResetModal() {
        document.getElementById('revenueResetModal').classList.add('hidden');
    }

    function executeRevenueReset() {
        closeRevenueResetModal();
        state.revenueResetBaseline = state.orders.reduce((sum, order) => sum + getOrderRevenue(order), 0);
        saveState();
        showToast('Total revenue has been reset.', 'success');
        renderAdminDashboard();
    }

    // ================= SITE -> WORSHA RENAME =================
    // Replaces any standalone "Site" label (never the compound "On-Site") with "Worsha".
    function applySiteRename() {
        if (!document.body) return;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walker.nextNode())) {
            if (n.nodeValue && /\bSite\b/.test(n.nodeValue) && !/On-Site/.test(n.nodeValue)) {
                n.nodeValue = n.nodeValue.replace(/(?<!On-)\bSite\b/g, 'Worsha');
            }
        }
    }

    // ================= STAFF RATINGS (Who We Are) =================
    // Average rating a staff member received: customer ratings left on orders whose
    // linked task was assigned to (and completed by) that person. Phone numbers are
    // no longer shown on this page — photo, name, role and ratings only.
    function renderStaffRating(username) {
        const ratings = state.orders
            .filter(o => o.customerFeedback && typeof o.customerFeedback.rating === 'number')
            .filter(o => {
                const task = getLinkedTaskForOrder(o.id);
                return task && task.assignedTo === username;
            });
        if (!ratings.length) {
            return `<p class="text-[10px] text-slate-400 italic pt-0.5">${L('No ratings yet', 'لا توجد تقييمات بعد')}</p>`;
        }
        const avg = ratings.reduce((s, o) => s + o.customerFeedback.rating, 0) / ratings.length;
        return `<div class="flex items-center gap-1.5 pt-0.5">${renderStarRow(avg, 'text-xs')}<span class="text-[10px] text-slate-400 font-bold">${avg.toFixed(1)} (${ratings.length})</span></div>`;
    }

    // ================= SHARED DYNAMIC EDIT MODAL =================
    function openDynamicModal(html) {
        closeDynamicModal();
        const wrap = document.createElement('div');
        wrap.id = 'dynamicEditModal';
        wrap.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        wrap.innerHTML = `<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">${html}</div>`;
        wrap.addEventListener('click', e => { if (e.target === wrap) closeDynamicModal(); });
        document.body.appendChild(wrap);
    }

    function closeDynamicModal() {
        const m = document.getElementById('dynamicEditModal');
        if (m) m.remove();
    }

    const EDIT_INPUT_CLS = 'w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sky-500';
    const EDIT_LBL = txt => `<label class="block font-bold uppercase text-slate-500 mb-1">${txt}</label>`;

    // ================= EDIT PRODUCT (name / category / price / image / specs / stock) =================
    function openEditProductModal(id) {
        if (!canManageAreas()) return;
        const p = state.products.find(x => x.id === id);
        if (!p) return;
        openDynamicModal(`
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 class="font-bold text-lg">${t('edit_product')}</h3>
            <button onclick="closeDynamicModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div class="space-y-3 text-xs">
            <div>${EDIT_LBL(t('item_details'))}<input type="text" id="editProdName" value="${escapeHtml(p.name)}" class="${EDIT_INPUT_CLS}"></div>
            <div>${EDIT_LBL(L('Category', 'الفئة'))}<input type="text" id="editProdCategory" value="${escapeHtml(p.category || '')}" class="${EDIT_INPUT_CLS}"></div>
            <div>${EDIT_LBL(t('price_egp'))}<input type="number" id="editProdPrice" min="0" step="any" value="${Number(p.price) || 0}" class="${EDIT_INPUT_CLS}"></div>
            ${imagePickFieldHtml('editProdImage', 'editProdImagePreview', 'previewEditProdImage', p.image)}
            <div>${EDIT_LBL(L('Specs / description', 'المواصفات / الوصف'))}<textarea id="editProdSpecs" rows="2" class="${EDIT_INPUT_CLS}">${escapeHtml(p.specs || '')}</textarea></div>
            <label class="flex items-center gap-2 font-bold text-red-500 cursor-pointer"><input type="checkbox" id="editProdOutOfStock" ${p.outOfStock ? 'checked' : ''} class="accent-red-500"> ${t('stock_label')}</label>
            <button onclick="saveProductEdit('${p.id}')" class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition">${t('save_changes')}</button>
        </div>`);
        pendingEditProdImage = p.image || null;
    }

    let pendingEditProdImage = null;
    let pendingEditSvcImage = null;
    const previewEditProdImage = makeImagePickHandler(v => pendingEditProdImage = v, 'editProdImagePreview');
    const previewEditSvcImage = makeImagePickHandler(v => pendingEditSvcImage = v, 'editSvcImagePreview');

    function saveProductEdit(id) {
        if (!canManageAreas()) return;
        const p = state.products.find(x => x.id === id);
        if (!p) return;
        const name = document.getElementById('editProdName').value.trim();
        const price = Number(document.getElementById('editProdPrice').value);
        if (!name || isNaN(price) || price < 0) {
            showToast(L('Please enter a valid name and price.', 'يرجى إدخال اسم وسعر صحيحين.'), 'error');
            return;
        }
        p.name = name;
        p.category = document.getElementById('editProdCategory').value.trim() || p.category;
        p.price = price;
        p.image = pendingEditProdImage || '';
        p.specs = document.getElementById('editProdSpecs').value.trim();
        p.outOfStock = document.getElementById('editProdOutOfStock').checked;
        saveState();
        closeDynamicModal();
        showToast(L('Product updated.', 'تم تحديث المنتج.'), 'success');
        renderProducts();
    }

    // ================= EDIT SERVICE / REPAIR (name / price / description / image) =================
    function openEditServiceModal(id) {
        if (!canManageAreas()) return;
        const s = state.services.find(x => x.id === id);
        if (!s) return;
        openDynamicModal(`
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 class="font-bold text-lg">${t('edit_service')}</h3>
            <button onclick="closeDynamicModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div class="space-y-3 text-xs">
            <div>${EDIT_LBL(t('item_details'))}<input type="text" id="editSvcName" value="${escapeHtml(s.name)}" class="${EDIT_INPUT_CLS}"></div>
            <div>${EDIT_LBL(t('price_egp'))}<input type="number" id="editSvcPrice" min="0" step="any" value="${Number(s.price) || 0}" class="${EDIT_INPUT_CLS}"></div>
            ${imagePickFieldHtml('editSvcImage', 'editSvcImagePreview', 'previewEditSvcImage', s.image)}
            <div>${EDIT_LBL(L('Description', 'الوصف'))}<textarea id="editSvcDesc" rows="3" class="${EDIT_INPUT_CLS}">${escapeHtml(s.desc || '')}</textarea></div>
            <button onclick="saveServiceEdit('${s.id}')" class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition">${t('save_changes')}</button>
        </div>`);
        pendingEditSvcImage = s.image || null;
    }

    function saveServiceEdit(id) {
        if (!canManageAreas()) return;
        const s = state.services.find(x => x.id === id);
        if (!s) return;
        const name = document.getElementById('editSvcName').value.trim();
        const price = Number(document.getElementById('editSvcPrice').value);
        if (!name || isNaN(price) || price < 0) {
            showToast(L('Please enter a valid name and price.', 'يرجى إدخال اسم وسعر صحيحين.'), 'error');
            return;
        }
        s.name = name;
        s.price = price;
        s.image = pendingEditSvcImage || '';
        s.desc = document.getElementById('editSvcDesc').value.trim();
        saveState();
        closeDynamicModal();
        showToast(L('Service updated.', 'تم تحديث الخدمة.'), 'success');
        renderTechServices();
    }

    // ================= EDIT ORDER (item details / price / location / gateway / status) =================
    function openEditOrderModal(orderId) {
        if (!state.currentUser || !isTopAdmin(state.currentUser.role)) {
            showToast(L('Only the head admin can edit orders.', 'المسؤول الرئيسي فقط يمكنه تعديل الطلبات.'), 'error');
            return;
        }
        const o = state.orders.find(x => x.id === orderId);
        if (!o) return;
        const statuses = ['Pending Dispatch', 'Inspection Requested', 'In Progress', 'On The Way', 'Delivered', 'Completed', 'Active / Verified', 'Open', 'Done', 'Cancelled'];
        if (o.status && !statuses.includes(o.status)) statuses.unshift(o.status);
        openDynamicModal(`
        <div class="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 class="font-bold text-lg">${t('edit_order')} — ${escapeHtml(o.id)}</h3>
            <button onclick="closeDynamicModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div class="space-y-3 text-xs">
            <div>${EDIT_LBL(t('item_details'))}<input type="text" id="editOrderItem" value="${escapeHtml(o.itemTitle || '')}" class="${EDIT_INPUT_CLS}"></div>
            <div>${EDIT_LBL(t('price_egp'))}<input type="number" id="editOrderAmount" min="0" step="any" value="${Number(o.amount) || 0}" class="${EDIT_INPUT_CLS}"></div>
            <div>${EDIT_LBL(escapeHtml(t('service_location_label')))}<input type="text" id="editOrderLocation" value="${escapeHtml(o.location || '')}" class="${EDIT_INPUT_CLS}"></div>
            <div>${EDIT_LBL(escapeHtml(t('th_gateway')))}<input type="text" id="editOrderGateway" value="${escapeHtml(o.gateway || '')}" class="${EDIT_INPUT_CLS}"></div>
            <div>${EDIT_LBL(t('status_label'))}<select id="editOrderStatus" class="${EDIT_INPUT_CLS}">${statuses.map(s => `<option value="${escapeHtml(s)}" ${s === o.status ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}</select></div>
            <button onclick="saveOrderEdit('${o.id}')" class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition">${t('save_changes')}</button>
        </div>`);
    }

    function saveOrderEdit(orderId) {
        if (!state.currentUser || !isTopAdmin(state.currentUser.role)) return;
        const o = state.orders.find(x => x.id === orderId);
        if (!o) return;
        const item = document.getElementById('editOrderItem').value.trim();
        const amount = Number(document.getElementById('editOrderAmount').value);
        if (!item || isNaN(amount) || amount < 0) {
            showToast(L('Please enter valid item details and price.', 'يرجى إدخال تفاصيل وسعر صحيحين.'), 'error');
            return;
        }
        o.itemTitle = item;
        o.amount = amount;
        o.location = document.getElementById('editOrderLocation').value.trim();
        o.gateway = document.getElementById('editOrderGateway').value.trim();
        o.status = document.getElementById('editOrderStatus').value;
        saveState();
        closeDynamicModal();
        showToast(L('Order updated.', 'تم تحديث الطلب.'), 'success');
        renderAdminDashboard();
    }

    // ================= FORGOT PASSWORD (sign in with registered phone number) =================
    let fpVerifiedUserId = null;

    function openForgotPasswordModal() {
        fpVerifiedUserId = null;
        const m = document.getElementById('forgotPasswordModal');
        if (!m) return;
        ['fpUsername', 'fpPhone', 'fpNewPassword'].forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.value = ''; el.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); handleForgotPassword(); } }; }
        });
        document.getElementById('fpPasswordBox').classList.add('hidden');
        document.getElementById('fpError').classList.add('hidden');
        const btn = document.getElementById('fpActionBtn');
        btn.textContent = t('fp_send');
        m.classList.remove('hidden');
        setTimeout(() => document.getElementById('fpUsername').focus(), 50);
    }

    function closeForgotPasswordModal() {
        fpVerifiedUserId = null;
        const m = document.getElementById('forgotPasswordModal');
        if (m) m.classList.add('hidden');
    }

    function fpShowError(msg) {
        const box = document.getElementById('fpError');
        document.getElementById('fpErrorText').textContent = msg;
        box.classList.remove('hidden');
    }

    function handleForgotPassword() {
        document.getElementById('fpError').classList.add('hidden');

        if (!fpVerifiedUserId) {
            // Step 1 — verify the username against a registered phone number
            const username = document.getElementById('fpUsername').value.trim();
            const phoneDigits = document.getElementById('fpPhone').value.replace(/\D/g, '');
            const user = state.users.find(u => u.username.toLowerCase() === username.toLowerCase());
            const phoneMatches = user && [user.whatsapp, user.contactPhone].some(p => p && String(p).replace(/\D/g, '') === phoneDigits);
            if (!phoneMatches) {
                fpShowError(t('fp_not_found'));
                return;
            }
            fpVerifiedUserId = user.id;
            document.getElementById('fpPasswordBox').classList.remove('hidden');
            document.getElementById('fpActionBtn').textContent = t('fp_reset');
            setTimeout(() => document.getElementById('fpNewPassword').focus(), 50);
            return;
        }

        // Step 2 — set the new password and sign the user in
        const pw = document.getElementById('fpNewPassword').value;
        if (!/^[A-Za-z0-9_]{6,}$/.test(pw)) {
            fpShowError(t('fp_invalid_pw'));
            return;
        }
        const user = state.users.find(u => u.id === fpVerifiedUserId);
        if (!user) { closeForgotPasswordModal(); return; }
        hashPassword(pw).then(hashed => {
            user.password = hashed;
            state.currentUser = user;
            saveState();
            closeForgotPasswordModal();
            closeAuthModal();
            showToast(t('fp_success'), 'success');
            renderApp();
            navigateTo(isStaffRole(user.role) ? 'admin-dashboard' : 'home');
        });
    }


    // ================= CONTACT US BOT (homepage assistant) =================
    // Floating "Contact Us" assistant: greets the visitor, collects name + phone,
    // then routes them to Orders / Repairs / Insurance — or hands the conversation
    // over to the Customer Services team (round-robin assignment).
    let botStep = 'closed';      // closed | ask_contact | menu | await_issue | in_chat | rate_cs | closed_notice
    let botName = '';
    let botPhone = '';
    let botChatId = null;
    let botMatchedUserId = null;
    let botRatingThen = null;    // optional callback to run once the customer rates (or skips) a CS chat

    // Looks up the typed name against our registered accounts (case-insensitive,
    // matches full name, username, or first name so "ahmed" / "Ahmed" / "Ahmed Hassan"
    // all resolve to the same registered customer).
    function findRegisteredUserByName(nameInput) {
        const q = String(nameInput || '').trim().toLowerCase();
        if (!q) return null;
        return state.users.find(u => {
            const uName = String(u.name || '').trim().toLowerCase();
            const uUser = String(u.username || '').trim().toLowerCase();
            const uFirst = uName.split(' ')[0];
            return uName === q || uUser === q || uFirst === q;
        }) || null;
    }

    // Lets the visitor reset the assistant at any point (main menu, mid-issue, or
    // even a live CS conversation) and start a fresh conversation from scratch.
    function botStartNewChat() {
        botHideMenu();
        if (botStep === 'rate_cs') {
            // Abandoning an in-progress rating prompt — just move on to a fresh chat.
            botRatingThen = null;
            botChatId = null;
            startBotConversation();
            return;
        }
        if (botStep === 'in_chat' && botChatId) {
            // Give them a chance to rate the conversation they're leaving before resetting.
            const chatId = botChatId;
            botChatId = null;
            botAskCsRating(chatId, () => startBotConversation());
            return;
        }
        botChatId = null;
        startBotConversation();
    }

    // Opens the sign-up form so an unregistered visitor can create an account.
    function botOpenSignup() {
        botHideMenu();
        const panel = document.getElementById('contactBotPanel');
        if (panel) panel.classList.add('hidden');
        toggleAuthMode('signup');
        openAuthModal();
    }

    // Invites the customer to rate the CS agent they just talked to. `andThen`
    // (optional) runs once they've rated or skipped — used when they manually
    // start a new chat mid-conversation instead of the agent closing it.
    function botAskCsRating(chatId, andThen) {
        const chats = loadCsChats();
        const chat = chats.find(c => c.id === chatId);
        if (chat && chat.customerRating) {
            // Already rated (e.g. re-triggered by a poll) — skip straight past the prompt.
            (andThen || finishCsRating)();
            return;
        }
        botStep = 'rate_cs';
        botRatingThen = andThen || null;
        botHideMenu();
        const stars = [1, 2, 3, 4, 5].map(n => `
        <button type="button" onclick="submitCsRating('${chatId}', ${n})" class="text-2xl px-1 text-amber-400 hover:scale-110 transition" aria-label="${n}">
            <i class="fa-solid fa-star"></i>
        </button>`).join('');
        botAddMessage('bot', `${L('Before you go — how was your experience with our Customer Service team?', 'قبل أن تغادر — كيف كانت تجربتك مع فريق خدمة العملاء؟')}<div id="csRatingWidget" class="flex gap-1 mt-2">${stars}</div>`);
        botShowMenu([
            { icon: 'fa-forward', label: L('Skip', 'تخطي'), action: 'skipCsRating()' }
        ]);
    }

    // Saves the star rating against the chat (so it can be attributed to the
    // assigned CS agent) and shows a quick thank-you in place of the stars.
    function submitCsRating(chatId, rating) {
        if (botStep !== 'rate_cs') return;
        const chats = loadCsChats();
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            chat.customerRating = { rating, submittedAt: new Date().toISOString() };
            saveCsChats(chats);
        }
        const widget = document.getElementById('csRatingWidget');
        if (widget) {
            widget.outerHTML = `<p class="text-xs text-amber-400 mt-2">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} <span class="text-slate-400">${L('Thanks for rating us!', 'شكراً لتقييمك!')}</span></p>`;
        }
        proceedAfterCsRating();
    }

    function skipCsRating() {
        if (botStep !== 'rate_cs') return;
        proceedAfterCsRating();
    }

    function proceedAfterCsRating() {
        botHideMenu();
        const next = botRatingThen;
        botRatingThen = null;
        if (typeof next === 'function') next();
        else finishCsRating();
    }

    function finishCsRating() {
        botChatId = null;
        botStep = 'closed_notice';
        botAddMessage('bot', L('Thanks for chatting with us today!', 'شكراً لتواصلك معنا اليوم!'));
        botShowMenu([
            { icon: 'fa-rotate-right', label: L('Start new chat', 'بدء محادثة جديدة'), action: 'botStartNewChat()' }
        ]);
    }

    function initContactBot() {
        if (document.getElementById('contactBotBtn')) return;

        const btn = document.createElement('button');
        btn.id = 'contactBotBtn';
        btn.type = 'button';
        btn.title = L('Contact Us', 'تواصل معنا');
        btn.className = 'fixed right-4 z-[60] flex flex-col items-center gap-1.5 bg-transparent p-0';
        btn.innerHTML = `
        <span class="w-14 h-14 rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/40 flex items-center justify-center transition hover:scale-105">
            <i class="fa-solid fa-headset text-xl"></i>
        </span>
        <span class="text-[10px] font-extrabold uppercase tracking-wide text-white bg-sky-600/90 px-2.5 py-1 rounded-full shadow">${L('Contact Us', 'تواصل معنا')}</span>`;
        btn.onclick = toggleContactBot;
        document.body.appendChild(btn);

        const panel = document.createElement('div');
        panel.id = 'contactBotPanel';
        panel.className = 'hidden fixed right-4 z-[60] w-[calc(100vw-2.5rem)] max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden';
        panel.innerHTML = `
        <div class="bg-gradient-to-r from-sky-600 to-cyan-500 text-white px-5 py-4 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center"><i class="fa-solid fa-headset"></i></div>
                <div>
                    <span class="block text-sm font-extrabold">${L('Contact Us', 'تواصل معنا')}</span>
                    <span class="block text-[10px] text-sky-100">${L('Cooling Art Assistant', 'مساعد كولينج آرت')}</span>
                </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <button type="button" onclick="botStartNewChat()" title="${L('Start new chat', 'محادثة جديدة')}" class="text-white/80 hover:text-white"><i class="fa-solid fa-rotate-right"></i></button>
                <button type="button" onclick="toggleContactBot()" class="text-white/80 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>
        <div id="chatBotMessages" class="flex-1 min-h-[200px] max-h-[45vh] overflow-y-auto p-4 space-y-3 text-xs bg-slate-50 dark:bg-slate-950/50"></div>
        <div id="chatBotMenu" class="shrink-0 border-t border-slate-100 dark:border-slate-800 p-3 space-y-2 hidden"></div>
        <form id="chatBotForm" class="shrink-0 border-t border-slate-100 dark:border-slate-800 p-3 flex gap-2 bg-white dark:bg-slate-900">
            <input type="text" id="chatBotInput" autocomplete="off" maxlength="300" placeholder="${L('Type your message...', 'اكتب رسالتك...')}" class="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500">
            <button type="submit" class="w-10 h-10 rounded-xl bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center transition shrink-0"><i class="fa-solid fa-paper-plane"></i></button>
        </form>`;
        document.body.appendChild(panel);
        document.getElementById('chatBotForm').addEventListener('submit', e => { e.preventDefault(); handleBotInput(); });

        // While the customer is in a CS conversation and the panel is open, poll
        // for the agent's replies so they appear without refreshing.
        setInterval(() => {
            const p = document.getElementById('contactBotPanel');
            if (botStep === 'in_chat' && botChatId && p && !p.classList.contains('hidden')) renderBotMessages();
        }, 5000);
    }

    function toggleContactBot() {
        const panel = document.getElementById('contactBotPanel');
        const opening = panel.classList.contains('hidden');
        panel.classList.toggle('hidden');
        if (!opening) return;
        if (botStep === 'closed' || botStep === 'ask_contact') startBotConversation();
        else if (botStep === 'menu') showBotMainMenu();
        else if (botStep === 'in_chat') renderBotMessages();
        else if (botStep === 'closed_notice') {
            botShowMenu([
                { icon: 'fa-rotate-right', label: L('Start new chat', 'بدء محادثة جديدة'), action: 'botStartNewChat()' }
            ]);
        }
    }

    function botAddMessage(who, html) {
        const box = document.getElementById('chatBotMessages');
        if (!box) return;
        const row = document.createElement('div');
        if (who === 'bot') {
            row.className = 'flex justify-start';
            row.innerHTML = `<div class="max-w-[85%] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-3.5 py-2.5 leading-relaxed">${html}</div>`;
        } else {
            row.className = 'flex justify-end';
            row.innerHTML = `<div class="max-w-[85%] bg-sky-500 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 leading-relaxed">${escapeHtml(html)}</div>`;
        }
        box.appendChild(row);
        box.scrollTop = box.scrollHeight;
    }

    function botShowMenu(buttons) {
        const menu = document.getElementById('chatBotMenu');
        if (!menu) return;
        menu.innerHTML = buttons.map(b => `
        <button type="button" onclick='${b.action}' class="w-full text-start bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-bold transition flex items-center gap-2.5">
            <i class="fa-solid ${b.icon} text-sky-500"></i>${b.label}
        </button>`).join('');
        menu.classList.remove('hidden');
    }

    function botHideMenu() {
        const m = document.getElementById('chatBotMenu');
        if (m) m.classList.add('hidden');
    }

    function startBotConversation() {
        const box = document.getElementById('chatBotMessages');
        if (box) box.innerHTML = '';
        botHideMenu();
        botStep = 'ask_contact';
        botName = '';
        botPhone = '';
        botMatchedUserId = null;
        botRatingThen = null;

        // If the user is already logged in, auto-fill their credentials and skip
        // straight to the main menu — no need to type name + phone.
        if (state.currentUser) {
            botName = state.currentUser.name || state.currentUser.username;
            botMatchedUserId = state.currentUser.id;
            botPhone = state.currentUser.phone || '';
            botStep = 'menu';
            botAddMessage('bot', `<strong>${L('Hello!', 'مرحباً!')} ${escapeHtml(botName)} 👋</strong><br>${L('Welcome back to Cooling Art. What can I help you with?', 'أهلاً بعودتك إلى كولينج آرت. كيف يمكنني مساعدتك؟')}`);
            showBotMainMenu();
            return;
        }

        // Guest: show two separate input fields for name and phone
        botAddMessage('bot', `<strong>${L('Hello! Welcome to Cooling Art.', 'مرحباً! أهلاً بك في كولينج آرت.')}</strong><br>${L('To help you faster, please enter your name and phone number below.', 'لخدمتك بشكل أسرع، يرجى إدخال اسمك ورقم هاتفك أدناه.')}`);
        showBotCredentialForm();
    }

    function handleBotInput() {
        const input = document.getElementById('chatBotInput');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';

        // In an open CS conversation, everything the customer types goes to the chat.
        if (botStep === 'in_chat' && botChatId) {
            botAddMessage('user', text);
            appendChatMessage(botChatId, 'customer', text);
            return;
        }

        botAddMessage('user', text);

        if (botStep === 'rate_cs') {
            botAddMessage('bot', L('Please tap a star above to rate us, or tap "Skip".', 'يرجى الضغط على نجمة بالأعلى لتقييمنا، أو الضغط على "تخطي".'));
            return;
        }

        if (botStep === 'closed_notice') {
            botAddMessage('bot', L('That conversation has ended. Tap "Start new chat" below to begin a new one.', 'انتهت تلك المحادثة. اضغط على "بدء محادثة جديدة" أدناه للبدء من جديد.'));
            botShowMenu([
                { icon: 'fa-rotate-right', label: L('Start new chat', 'بدء محادثة جديدة'), action: 'botStartNewChat()' }
            ]);
            return;
        }

        if (botStep === 'ask_contact') {
            // Guest typed into the free-text input while the credential form is shown;
            // just remind them to use the dedicated fields.
            botAddMessage('bot', L('Please use the Name and Phone fields below to identify yourself.', 'يرجى استخدام حقلَي الاسم والهاتف أدناه للتعريف بنفسك.'));
            showBotCredentialForm();
            return;
        }

        if (botStep === 'await_issue') {
            const chat = createCsChat({ name: botName, phone: botPhone, topic: text, userId: botMatchedUserId });
            if (!chat) {
                botAddMessage('bot', L('Sorry, no customer service agent is available right now. Please try again later or use the Contact Us page.', 'عذراً، لا يتوفر وكيل خدمة عملاء حالياً. يرجى المحاولة لاحقاً أو استخدام صفحة تواصل معنا.'));
                showBotMainMenu();
                return;
            }
            botChatId = chat.id;
            botStep = 'in_chat';
            const csUser = state.users.find(u => u.username === chat.assignedTo);
            botAddMessage('bot', `${L('Thank you! Your message has been passed to', 'شكراً! تم تمرير رسالتك إلى')} <strong>${escapeHtml(csUser ? csUser.name : L('Customer Service', 'خدمة العملاء'))}</strong> ${L('from our support team. You can keep typing here — replies will appear in this chat.', 'من فريق الدعم. يمكنك الاستمرار في الكتابة هنا — ستظهر الردود في هذه المحادثة.')}`);
        }
    }

    function showBotMainMenu() {
        botStep = 'menu';
        showBotCredentialForm(false); // hide credential form if still showing
        botShowMenu([
            { icon: 'fa-box', label: L('Orders — browse AC units', 'الطلبات — تصفح أجهزة التكييف'), action: 'botTopic("orders")' },
            { icon: 'fa-screwdriver-wrench', label: L('Repairs — book a technical fix', 'الصيانة — حجز خدمة فنية'), action: 'botTopic("repairs")' },
            { icon: 'fa-headset', label: L('Talk to Customer Service', 'التحدث إلى خدمة العملاء'), action: 'botTopic("cs")' }
        ]);
    }

    // Shows (or hides) the two-field credential form inside the bot panel.
    // When show=true (default), renders name + phone inputs with a Submit button
    // into #chatBotMenu so it sits above the message input naturally.
    function showBotCredentialForm(show = true) {
        const menu = document.getElementById('chatBotMenu');
        if (!menu) return;
        if (!show) {
            if (!menu.querySelector('.bot-cred-form')) return; // not showing
            menu.classList.add('hidden');
            menu.innerHTML = '';
            return;
        }
        menu.innerHTML = `
        <div class="bot-cred-form space-y-2">
            <input type="text" id="botCredName" autocomplete="name" maxlength="60"
                placeholder="${L('Your full name', 'اسمك الكامل')}"
                class="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500">
            <input type="tel" id="botCredPhone" autocomplete="tel" maxlength="20"
                placeholder="${L('Phone number (e.g. 01012345678)', 'رقم الهاتف (مثال: 01012345678)')}"
                class="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500">
            <button type="button" onclick="submitBotCredentials()"
                class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl py-2.5 text-xs transition">
                ${L('Continue', 'متابعة')} <i class="fa-solid fa-arrow-right ms-1"></i>
            </button>
            <button type="button" onclick="botOpenSignup()"
                class="w-full text-xs text-sky-500 hover:underline text-center">
                ${L("Don't have an account? Sign up", 'ليس لديك حساب؟ إنشاء حساب')}
            </button>
        </div>`;
        menu.classList.remove('hidden');
        document.getElementById('botCredName')?.focus();
    }

    // Called when the guest presses Continue in the credential form.
    function submitBotCredentials() {
        const nameVal = (document.getElementById('botCredName')?.value || '').trim();
        const phoneVal = (document.getElementById('botCredPhone')?.value || '').replace(/[\s-]/g, '');

        if (!nameVal) {
            document.getElementById('botCredName')?.focus();
            botAddMessage('bot', L('Please enter your name.', 'يرجى إدخال اسمك.'));
            return;
        }
        if (!phoneVal || phoneVal.length < 10) {
            document.getElementById('botCredPhone')?.focus();
            botAddMessage('bot', L('Please enter a valid phone number.', 'يرجى إدخال رقم هاتف صحيح.'));
            return;
        }

        // Echo the submission as a user bubble
        botAddMessage('user', `${nameVal} — ${phoneVal}`);

        const matched = findRegisteredUserByName(nameVal);
        if (!matched) {
            botAddMessage('bot', `${L('Sorry, we couldn\'t find', 'عذراً، لم نتمكن من العثور على')} <strong>${escapeHtml(nameVal)}</strong> ${L('in our registered customers. Please check the name as it appears on your account, or sign up below.', 'ضمن عملائنا المسجلين. يرجى التحقق من الاسم كما هو مسجل في حسابك، أو أنشئ حساباً أدناه.')}`);
            showBotCredentialForm(); // keep form visible
            return;
        }

        botMatchedUserId = matched.id;
        botName = matched.name;
        botPhone = phoneVal;
        botStep = 'menu';
        botAddMessage('bot', `${L('Nice to meet you', 'سعيد بمعرفتك')} <strong>${escapeHtml(botName)}</strong>! ${L('What do you need help with?', 'بم يمكنني مساعدتك؟')}`);
        showBotMainMenu();
    }

    // Called whenever the auth state changes (login or logout) to reset the bot
    // so it reflects the new session state cleanly.
    function botResetForAuthChange() {
        botChatId = null;
        botRatingThen = null;
        startBotConversation();
        // Keep the panel closed — the reset happens silently in the background.
        // If it was already open, re-open it to show the fresh state.
        const panel = document.getElementById('contactBotPanel');
        if (panel && !panel.classList.contains('hidden')) {
            // panel is open — refresh its content now
        } else if (panel) {
            // panel is closed — just prime the state so next open is fresh
            botStep = 'closed';
        }
    }

    function botTopic(topic) {
        botHideMenu();
        const egp = t('egp_symbol', 'EGP');
        if (topic === 'orders') {
            const items = state.products.slice(0, 3).map(p => `• ${escapeHtml(p.name)} — <strong>${Number(p.price).toLocaleString()} ${egp}</strong>`).join('<br>');
            botAddMessage('bot', `${L('Here are some of our best-selling units:', 'إليك بعض أكثر الوحدات مبيعاً:')}<br>${items}<br><br>${L('Tap below to see the full catalog and place an order:', 'اضغط بالأسفل لعرض كامل المنتجات وتقديم طلب:')}`);
            botShowMenu([
                { icon: 'fa-arrow-right', label: L('Open Products page', 'فتح صفحة المنتجات'), action: 'botNavigate("products")' },
                { icon: 'fa-headset', label: L('Talk to Customer Service', 'التحدث إلى خدمة العملاء'), action: 'botTopic("cs")' }
            ]);
        } else if (topic === 'repairs') {
            const items = state.services.slice(0, 3).map(s => `• ${escapeHtml(s.name)} — <strong>${Number(s.price).toLocaleString()} ${egp}</strong>`).join('<br>');
            botAddMessage('bot', `${L('Our repair services:', 'خدمات الصيانة لدينا:')}<br>${items}<br><br>${L('Tap below to book a certified technician:', 'اضغط بالأسفل لحجز فني معتمد:')}`);
            botShowMenu([
                { icon: 'fa-arrow-right', label: L('Open Repairs page', 'فتح صفحة الصيانة'), action: 'botNavigate("tech-fix")' },
                { icon: 'fa-headset', label: L('Talk to Customer Service', 'التحدث إلى خدمة العملاء'), action: 'botTopic("cs")' }
            ]);
        } else if (topic === 'cs') {
            const csUsers = state.users.filter(u => u.role === 'hr');
            if (!csUsers.length) {
                botAddMessage('bot', L('Sorry, no customer service agent is available right now. Please try again later.', 'عذراً، لا يتوفر وكيل خدمة عملاء حالياً. يرجى المحاولة لاحقاً.'));
                showBotMainMenu();
                return;
            }
            botStep = 'await_issue';
            botAddMessage('bot', L('Sure! Please type your question or describe what you need, and I will pass it to our customer service team right away.', 'بالتأكيد! اكتب سؤالك أو ما تحتاجه وسأقوم بتمريره إلى فريق خدمة العملاء فوراً.'));
        }
    }

    function botNavigate(view) {
        botHideMenu();
        const panel = document.getElementById('contactBotPanel');
        if (panel) panel.classList.add('hidden');
        navigateTo(view);
    }

    // Renders the customer's view of an open CS conversation (bot side of the chat).
    function renderBotMessages() {
        const box = document.getElementById('chatBotMessages');
        if (!box || !botChatId) return;
        const chats = loadCsChats();
        const chat = chats.find(c => c.id === botChatId);
        if (!chat) return;
        box.innerHTML = `<p class="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wide">${L('Conversation with Customer Service', 'محادثة مع خدمة العملاء')}</p>`;
        // 'bot'-role bubbles render raw HTML (used for our own scripted messages), so an
        // agent's free-typed reply must be escaped here first or stray <, >, & can make
        // part of their message vanish or misrender. Customer-authored ('user') bubbles
        // already escape internally, so pass those through as-is.
        (chat.messages || []).forEach(m => {
            if (m.from === 'cs') botAddMessage('bot', escapeHtml(m.text));
            else botAddMessage('user', m.text);
        });

        // The agent closed the chat from their side — let the customer know, stop
        // them from typing into a dead conversation, and invite them to rate it.
        if (chat.status === 'closed' && botStep === 'in_chat') {
            botAddMessage('bot', L('This conversation has been closed by our team. Thanks for reaching out!', 'تم إغلاق هذه المحادثة من قبل فريقنا. شكراً لتواصلك معنا!'));
            botAskCsRating(chat.id);
        }
    }

    // ================= CUSTOMER SERVICE CHATS (round-robin assignment) =================
    function loadCsChats() {
        try {
            const stored = JSON.parse(localStorage.getItem('ca_cs_chats'));
            if (Array.isArray(stored)) return stored;
        } catch (e) { /* none saved yet */ }
        return [];
    }

    function saveCsChats(chats) {
        localStorage.setItem('ca_cs_chats', JSON.stringify(chats));
    }

    // Distributes incoming chats across the CS team one by one: first chat → CS1,
    // next → CS2, next → CS3, then back to CS1. The counter persists in localStorage.
    function assignCsRoundRobin() {
        const csList = state.users
            .filter(u => u.role === 'hr')
            .sort((a, b) => String(a.joinedDate || '').localeCompare(String(b.joinedDate || '')) || a.username.localeCompare(b.username));
        if (!csList.length) return null;
        const counter = Number(localStorage.getItem('ca_cs_counter') || 0);
        localStorage.setItem('ca_cs_counter', String(counter + 1));
        return csList[counter % csList.length];
    }

    function createCsChat({ name, phone, topic, userId }) {
        const chats = loadCsChats();
        const cs = assignCsRoundRobin();
        if (!cs) return null;
        const now = new Date().toISOString();
        const chat = {
            id: createDateBasedId('CHAT'),
            customerName: name || 'Customer',
            customerPhone: phone || '',
            customerUserId: userId || null,   // links back to the registered account, when known
            topic: String(topic || '').slice(0, 300),
            assignedTo: cs.username,      // assignment is permanent for the life of the chat
            status: 'open',
            createdAt: now,
            lastActivity: now,
            messages: [{ from: 'customer', text: String(topic || ''), at: now }]
        };
        chats.unshift(chat);
        saveCsChats(chats);
        if (getCurrentViewId() === 'admin-dashboard') renderAdminDashboard();
        return chat;
    }

    function appendChatMessage(chatId, from, text) {
        const chats = loadCsChats();
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;
        chat.messages.push({ from, text: String(text).slice(0, 500), at: new Date().toISOString() });
        chat.lastActivity = new Date().toISOString();
        saveCsChats(chats);
        // Refresh just the chats card, not the whole dashboard — a full dashboard
        // rebuild would wipe out whatever an agent is mid-typing into a reply box.
        if (getCurrentViewId() === 'admin-dashboard') renderAdminChats();
        if (from === 'cs' && botChatId === chatId && botStep === 'in_chat') renderBotMessages();
    }

    // "Customer Chats" card on the admin dashboard: the head admin sees every open
    // chat (with its assigned CS agent), and each CS sees only the chats assigned
    // to them. Replies go straight back to the customer's bot chat window.
    function renderAdminChats() {
        const section = document.getElementById('adminChatsSection');
        if (!section) return;
        const isManager = state.currentUser && (isTopAdmin(state.currentUser.role) || state.currentUser.role === 'hr');
        section.classList.toggle('hidden', !isManager);
        if (!isManager) return;

        const openChats = loadCsChats().filter(c => c.status === 'open');
        const visible = isTopAdmin(state.currentUser.role)
            ? openChats
            : openChats.filter(c => c.assignedTo === state.currentUser.username);

        const badge = document.getElementById('adminChatsCount');
        if (badge) badge.textContent = visible.length;

        const list = document.getElementById('adminChatsList');
        if (!list) return;

        // This list re-renders on every incoming/outgoing message and on a timer,
        // so capture whatever an agent is mid-typing (and cursor/focus) before we
        // rebuild the DOM, then restore it after — otherwise a reply in progress
        // gets wiped out from under them before they can send it.
        const drafts = {};
        let focusedChatId = null;
        let focusedSelectionStart = null;
        list.querySelectorAll('input[data-chat-id]').forEach(inp => {
            const id = inp.getAttribute('data-chat-id');
            if (inp.value) drafts[id] = inp.value;
            if (document.activeElement === inp) {
                focusedChatId = id;
                focusedSelectionStart = inp.selectionStart;
            }
        });

        if (!visible.length) {
            list.innerHTML = `<p class="text-xs text-slate-400 text-center py-6 font-bold">${L('No customer chats waiting for a response.', 'لا توجد محادثات عملاء بانتظار رد.')}</p>`;
            return;
        }
        list.innerHTML = visible.map(c => renderCsChatCard(c)).join('');

        Object.keys(drafts).forEach(id => {
            const inp = list.querySelector(`input[data-chat-id="${id}"]`);
            if (inp) inp.value = drafts[id];
        });
        if (focusedChatId) {
            const inp = list.querySelector(`input[data-chat-id="${focusedChatId}"]`);
            if (inp) {
                inp.focus();
                if (focusedSelectionStart !== null) inp.setSelectionRange(focusedSelectionStart, focusedSelectionStart);
            }
        }
    }

    function renderCsChatCard(c) {
        const assignedUser = state.users.find(u => u.username === c.assignedTo);
        const msgs = (c.messages || []).map(m => `
        <div class="flex ${m.from === 'cs' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[80%] rounded-xl px-3 py-1.5 leading-relaxed ${m.from === 'cs' ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-800'}">
                ${escapeHtml(m.text)}
                <span class="block text-[9px] opacity-70 mt-0.5">${escapeHtml(formatDateTime(m.at))}</span>
            </div>
        </div>`).join('');
        return `
    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 space-y-3">
        <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2.5 text-xs font-bold">
                <span class="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-500 flex items-center justify-center shrink-0"><i class="fa-solid fa-user"></i></span>
                <span>${escapeHtml(c.customerName)}</span>
                ${c.customerPhone ? `<span class="text-slate-400 font-mono font-normal" dir="ltr">${escapeHtml(c.customerPhone)}</span>` : ''}
                <span class="text-[10px] text-slate-400 font-normal">${escapeHtml(formatDateTime(c.createdAt))}</span>
            </div>
            <div class="flex items-center gap-2 text-[10px] font-extrabold uppercase">
                ${isTopAdmin(state.currentUser.role) ? `<span class="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400"><i class="fa-solid fa-headset me-1"></i>${escapeHtml(assignedUser ? assignedUser.name : c.assignedTo || '—')}</span>` : ''}
                <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">Open</span>
                <button type="button" onclick="closeCsChat('${c.id}')" class="px-2.5 py-1 rounded-full bg-slate-200 text-slate-500 hover:bg-emerald-200 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950 dark:hover:text-emerald-400 transition" title="${L('Close chat', 'إغلاق المحادثة')}"><i class="fa-solid fa-check"></i></button>
            </div>
        </div>
        <div class="max-h-44 overflow-y-auto custom-scrollbar space-y-1.5 bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800">${msgs}</div>
        <form onsubmit="csReplySubmit(event, '${c.id}')" class="flex gap-2">
            <input type="text" data-chat-id="${c.id}" required maxlength="500" placeholder="${L('Type your reply...', 'اكتب ردك...')}" class="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500">
            <button type="submit" class="w-9 h-9 rounded-xl bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center transition shrink-0"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
    </div>`;
    }

    function csReplySubmit(e, chatId) {
        e.preventDefault();
        const input = e.target.querySelector('input');
        const text = input ? input.value.trim() : '';
        if (!text) return;
        if (input) input.value = ''; // clear before re-render so it isn't treated as a leftover draft
        appendChatMessage(chatId, 'cs', text);
    }

    function closeCsChat(chatId) {
        if (!state.currentUser || (!isTopAdmin(state.currentUser.role) && state.currentUser.role !== 'hr')) return;
        const chats = loadCsChats();
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;
        chat.status = 'closed';
        chat.closedAt = new Date().toISOString();
        saveCsChats(chats);
        showToast(L('Chat closed.', 'تم إغلاق المحادثة.'), 'success');
        renderAdminChats();
    }

    // ================= INSURANCE PAGE LOGIC =================
    function populateInsuranceLocations() {
        const select = document.getElementById('insuranceLocation');
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '';
        const locs = (state.serviceAreas && state.serviceAreas.length > 0)
            ? state.serviceAreas
            : ['Cairo (El Nozha)', 'Cairo (Maadi)', 'Cairo (Nasr City)', 'Giza (Dokki)', 'Giza (6th of October)', 'Alexandria'];
        locs.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc;
            select.appendChild(opt);
        });
        if (currentVal && locs.includes(currentVal)) {
            select.value = currentVal;
        }
    }

    function toggleGatewayDetails(method) {
        const instaDetails = document.getElementById('instapayDetails');
        const vodaDetails = document.getElementById('vodafoneDetails');
        const labelInsta = document.getElementById('labelInstapay');
        const labelVoda = document.getElementById('labelVodafone');

        const ACTIVE = ['border-2', 'border-sky-500', 'bg-sky-50/50', 'dark:bg-sky-950/40'];
        const INACTIVE = ['border', 'border-slate-200', 'dark:border-slate-700'];

        if (instaDetails && vodaDetails) {
            if (method === 'instapay') {
                instaDetails.classList.remove('hidden');
                vodaDetails.classList.add('hidden');
                if (labelInsta) { labelInsta.classList.remove(...INACTIVE); labelInsta.classList.add(...ACTIVE); }
                if (labelVoda) { labelVoda.classList.remove(...ACTIVE); labelVoda.classList.add(...INACTIVE); }
            } else {
                instaDetails.classList.add('hidden');
                vodaDetails.classList.remove('hidden');
                if (labelVoda) { labelVoda.classList.remove(...INACTIVE); labelVoda.classList.add(...ACTIVE); }
                if (labelInsta) { labelInsta.classList.remove(...ACTIVE); labelInsta.classList.add(...INACTIVE); }
            }
        }
    }

    function submitInsurancePayment(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (!state.currentUser) {
            showToast(state.currentLang === 'ar' ? 'يرجى تسجيل الدخول أولاً!' : 'Please login to process insurance payment!', 'error');
            openAuthModal('login');
            return;
        }

        const location = document.getElementById('insuranceLocation')?.value.trim() || '';
        const unitRef = document.getElementById('insuranceUnitRef')?.value.trim() || '';
        const txRef = document.getElementById('insuranceTxRef')?.value.trim() || '';

        const serialErr = document.getElementById('insuranceUnitRefError');
        const serialErrText = document.getElementById('insuranceUnitRefErrorText');
        if (!unitRef) {
            if (serialErr && serialErrText) {
                serialErrText.textContent = state.currentLang === 'ar' ? 'يرجى إدخال رقم الوحدة / السيريال' : 'Please enter unit reference or serial number';
                serialErr.classList.remove('hidden');
            }
            document.getElementById('insuranceUnitRef')?.focus();
            return;
        }

        const selectedGwElem = document.querySelector('input[name="insuranceGateway"]:checked');
        const selectedGw = selectedGwElem ? selectedGwElem.value : 'InstaPay';
        if (!txRef) {
            const insErr = document.getElementById('insuranceTxRefError');
            const insErrText = document.getElementById('insuranceTxRefErrorText');
            if (insErr && insErrText) {
                insErrText.textContent = state.currentLang === 'ar' ? 'يرجى إدخال رقم مرجع المعاملة' : 'Please enter transaction reference number';
                insErr.classList.remove('hidden');
            }
            document.getElementById('insuranceTxRef')?.focus();
            return;
        }

        const newOrder = {
            id: createDateBasedId('INS'),
            orderRef: 'INS-' + Math.floor(100000 + Math.random() * 900000),
            user: state.currentUser.name || state.currentUser.username,
            username: state.currentUser.username,
            itemTitle: `Protection Insurance (${unitRef})`,
            amount: 100,
            gateway: selectedGw === 'instapay' ? 'InstaPay' : 'Vodafone Cash',
            transactionRef: txRef,
            status: 'Approved',
            date: getLocalDateString(),
            type: 'Insurance',
            location: location,
            insurancePaid: 'Paid / Active'
        };

        state.orders.unshift(newOrder);
        saveState();

        if (document.getElementById('insuranceUnitRef')) document.getElementById('insuranceUnitRef').value = '';
        if (document.getElementById('insuranceTxRef')) document.getElementById('insuranceTxRef').value = '';

        showToast(state.currentLang === 'ar' ? 'تم تأكيد سداد قسط التأمين بنجاح!' : 'Insurance Payment Submitted & Verified!', 'success');
        closeInsuranceModal();
        navigateTo('customer-dashboard');
    }

    function openInsuranceModal() {
        const modal = document.getElementById('insuranceModal');
        if (!modal) return;
        const sel = document.getElementById('insuranceLocation');
        if (sel) sel.innerHTML = getLocationOptionsHtml();
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        modal.onclick = function (e) { if (e.target === modal) closeInsuranceModal(); };
    }

    function closeInsuranceModal() {
        const modal = document.getElementById('insuranceModal');
        if (!modal) return;
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }


// ================= MOBILE LEFT SLIDE-IN MENU =================
function openMobileMenu() {
    document.body.classList.add('mobile-menu-open');
    const h = document.getElementById('siteHeader'); if (h) h.classList.add('menu-open');
    const b = document.getElementById('mobileMenuBtn'); if (b) b.setAttribute('aria-expanded', 'true');
}
function closeMobileMenu() {
    document.body.classList.remove('mobile-menu-open');
    const h = document.getElementById('siteHeader'); if (h) h.classList.remove('menu-open');
    const b = document.getElementById('mobileMenuBtn'); if (b) b.setAttribute('aria-expanded', 'false');
}
function toggleMobileMenu() {
    document.body.classList.contains('mobile-menu-open') ? closeMobileMenu() : openMobileMenu();
}
document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('#mainNav a.nav-link')) closeMobileMenu();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobileMenu(); });
window.addEventListener('resize', () => { if (window.innerWidth >= 1024) closeMobileMenu(); });


// Load the shared gallery from the cloud as soon as the page is ready
window.addEventListener('DOMContentLoaded', () => { syncHomeGalleryFromCloud(true); });
