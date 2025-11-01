import express from 'express';

const router = express.Router();

/**
 * Minimal chart of accounts (search source).
 * Extend this list any time.
 */
const COA = [
  { number: '5100', name: 'Fertigungsmaterialverbrauch',  label: 'Direct material consumption' },
  { number: '5300', name: 'Hilfsmaterialverbrauch',       label: 'Indirect material consumption' },
  { number: '6000', name: 'Fertigungslöhne',              label: 'Direct labor' },
  { number: '6010', name: 'Hilfslöhne',                   label: 'Indirect labor' },
  { number: '6020', name: 'Sonderzahlungen Arbeiter',     label: 'Special payments – workers' },
  { number: '6200', name: 'Gehälter',                      label: 'Salaries' },
  { number: '6540', name: 'Gesetzliche Lohnabgaben',       label: 'Statutory payroll charges' },
  { number: '7010', name: 'Abschreibungen Sachanlagen',    label: 'Depreciation of fixed assets' },
  { number: '7700', name: 'Versicherungsaufwand',          label: 'Insurance expense' },
  { number: '7830', name: 'Schadensfälle',                 label: 'Damages / losses' },
  { number: '8230', name: 'Zinsenaufwand für Bankkredite', label: 'Interest expense (bank loans)' },
];

/**
 * In-memory store for saved BÜB rows (per user).
 * NOTE: this is volatile (resets when the server restarts).
 * Structure: Map<userId, { period: string, rows: [...] }>
 */
const buebStore = new Map();

/* ---------------------- Page ---------------------- */
/** GET /cost-types  → serve the BÜB page */
router.get('/', (_req, res) => {
  res.sendFile(process.cwd() + '/public/html/bueb.html');
});

/* ---------------------- Search -------------------- */
/** GET /cost-types/api/search?q=...  → typeahead by number/name/label */
router.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json([]);
  const out = COA.filter(a =>
    a.number.startsWith(q) ||
    a.name.toLowerCase().includes(q) ||
    a.label.toLowerCase().includes(q)
  ).slice(0, 20);
  res.json(out);
});

/* ---------------------- Save ---------------------- */
/** POST /cost-types/api/bueb/save
 *  body: { period, rows: [{account_no, account_label, expense, minus, plus, cost}] }
 *  returns: { ok:true, next:'/kostenstellen' }
 */
router.post('/api/bueb/save', (req, res) => {
  const { period = '', rows = [] } = req.body || {};
  if (!period || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).send('Invalid payload');
  }

  // If you run behind auth middleware, you can keep this:
  const userId = req.user?.uid ?? 'anon'; // fallback for dev if not logged in

  buebStore.set(userId, { period, rows });

  // you can later read this in your Kostenstellenrechnung route
  return res.json({ ok: true, next: '/kostenstellen' });
});

/* ---------------------- (Optional) Load last ----- */
/** GET /cost-types/api/bueb/last → returns last saved for the user (handy later) */
router.get('/api/bueb/last', (req, res) => {
  const userId = req.user?.uid ?? 'anon';
  res.json(buebStore.get(userId) || null);
});

export default router;
