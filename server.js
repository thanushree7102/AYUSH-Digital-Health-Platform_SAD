// AYUSH Digital Health Platform - backend (Express + SQLite)
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const crypto = require('crypto');
const db = require('./db');

const PORT = process.env.PORT || 4000;
const OTP_CODE = process.env.OTP_CODE || '123456';
const ADMIN_INVITE = process.env.ADMIN_INVITE || 'AYUSH-ADMIN-2026';
const SEED_DEMO = process.env.SEED_DEMO !== '0';

const now = () => new Date().toISOString();
const rnd = (n) => Array.from({ length: n }, () => crypto.randomInt(0, 10)).join('');
const pick = (o, ...keys) => { for (const k of keys) if (o && o[k] !== undefined && o[k] !== '') return o[k]; return null; };
const isMobile = (m) => /^[6-9]\d{9}$/.test(String(m || ''));

// ---------- demo data ----------
function seed() {
  if (db.prepare('SELECT COUNT(*) c FROM admins').get().c > 0) return;
  const t = now();
  db.prepare(`INSERT INTO facilities (id,name,facility_type,mobile,email,registration_no,address,status,submitted_at)
              VALUES ('F-1','Demo Ayush Clinic','Clinic','9000000005','clinic@demo.in','CL-001','Bengaluru','approved',?)`).run(t);
  const ins = db.prepare(`INSERT INTO practitioners (id,name,system,mobile,email,registration_no,council,qualification,facility_id,status,submitted_at)
              VALUES (?,?,?,?,?,?,?,?,?, 'approved',?)`);
  ins.run('D-1', 'Dr. Ayurveda Demo', 'Ayurveda', '9000000001', 'd1@demo.in', 'R-1', 'CCIM', 'BAMS', 'F-1', t);
  ins.run('D-2', 'Dr. Siddha Demo', 'Siddha', '9000000002', 'd2@demo.in', 'R-2', 'CCIM', 'BSMS', 'F-1', t);
  const adm = db.prepare('INSERT INTO admins (id,name,mobile,email,role,created_at) VALUES (?,?,?,?,?,?)');
  adm.run('A-1', 'Demo Administrator', '9000000009', 'admin@demo.in', 'admin', t);
  adm.run('A-2', 'Demo Auditor', '9000000008', 'auditor@demo.in', 'auditor', t);
}
if (SEED_DEMO) seed();

// ---------- app ----------
const app = express();
app.use(cors({
  origin: true,
  allowedHeaders: ['Content-Type', 'Idempotency-Key', 'X-Role', 'X-Doctor-Id', 'X-Admin-Id', 'X-Facility-Id', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const v1 = express.Router();
const role = (req) => String(req.get('X-Role') || '').toLowerCase();
const forbid = (res, msg = 'Forbidden') => res.status(403).json({ message: msg });
const getPatient = (id) => db.prepare('SELECT * FROM patients WHERE health_id = ? OR consultation_id = ?').get(id, id);

// ---------- auth: register ----------
v1.post('/auth/register', (req, res) => {
  const { mobile, otp, aadhaar } = req.body || {};
  if (!isMobile(mobile)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
  if (String(otp) !== OTP_CODE) return res.status(401).json({ message: `That OTP isn't right. Use ${OTP_CODE} for this demo.` });
  if (!/^[2-9]\d{11}$/.test(String(aadhaar || '').replace(/\s/g, ''))) return res.status(400).json({ message: 'Aadhaar must be 12 digits.' });
  if (db.prepare('SELECT 1 FROM patients WHERE mobile = ?').get(mobile))
    return res.status(409).json({ message: 'This mobile number already has a record. Sign in instead.' });
  const a = String(aadhaar).replace(/\s/g, '');
  const healthId = `91-${rnd(4)}-${rnd(4)}-${rnd(4)}`;
  const masked = `XXXX XXXX ${a.slice(-4)}`;
  db.prepare('INSERT INTO patients (health_id,name,mobile,masked_aadhaar,consultation_id,created_at) VALUES (?,?,?,?,?,?)')
    .run(healthId, 'Demo Patient', mobile, masked, `C-${rnd(9)}`, now());
  res.status(201).json({ healthId, patientId: healthId, name: 'Demo Patient', maskedAadhaar: masked });
});

// Patient self-registration form (uses Idempotency-Key)
v1.post('/patients/register', (req, res) => {
  const key = req.get('Idempotency-Key');
  if (key) {
    const prev = db.prepare('SELECT * FROM idempotency WHERE key=? AND route=?').get(key, 'patients/register');
    if (prev) return res.status(prev.status).json(JSON.parse(prev.response));
  }
  const b = req.body || {};
  const name = pick(b, 'name', 'fullName');
  const mobile = pick(b, 'mobile', 'phone');
  if (!name) return res.status(400).json({ message: 'Name is required.' });
  if (!isMobile(mobile)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
  if (db.prepare('SELECT 1 FROM patients WHERE mobile = ?').get(mobile))
    return res.status(409).json({ message: 'This mobile number already has a record.' });
  const healthId = `91-${rnd(4)}-${rnd(4)}-${rnd(4)}`;
  const consultationId = `C-${rnd(9)}`;
  db.prepare('INSERT INTO patients (health_id,name,mobile,details,consultation_id,created_at) VALUES (?,?,?,?,?,?)')
    .run(healthId, name, mobile, JSON.stringify(b), consultationId, now());
  const out = { patientId: healthId, healthId, consultationId, name };
  if (key) db.prepare('INSERT INTO idempotency VALUES (?,?,?,?)').run(key, 'patients/register', 201, JSON.stringify(out));
  res.status(201).json(out);
});

v1.post('/auth/register/practitioner', (req, res) => {
  const b = req.body || {};
  const name = pick(b, 'name', 'fullName');
  const mobile = pick(b, 'mobile', 'phone');
  const system = pick(b, 'system', 'ayushSystem') || 'Ayurveda';
  if (!name) return res.status(400).json({ message: 'Name is required.' });
  if (!isMobile(mobile)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
  if (db.prepare('SELECT 1 FROM practitioners WHERE mobile = ?').get(mobile))
    return res.status(409).json({ message: 'This mobile number is already registered.' });
  const id = `DR-${rnd(4)}-${rnd(4)}`;
  db.prepare(`INSERT INTO practitioners (id,name,system,mobile,email,registration_no,council,qualification,facility_id,certificate_name,status,submitted_at)
              VALUES (?,?,?,?,?,?,?,?,?,?, 'pending', ?)`).run(
    id, name, system, mobile, pick(b, 'email'), pick(b, 'registrationNo', 'registrationNumber', 'regNo'),
    pick(b, 'council'), pick(b, 'qualification'), pick(b, 'facilityId'), pick(b, 'certificateName', 'certificate'), now());
  res.status(201).json({ id, doctorId: id, status: 'pending', message: 'Submitted for admin approval.' });
});

v1.post('/auth/register/facility', (req, res) => {
  const b = req.body || {};
  const name = pick(b, 'name', 'facilityName');
  const mobile = pick(b, 'mobile', 'phone');
  if (!name) return res.status(400).json({ message: 'Facility name is required.' });
  if (!isMobile(mobile)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
  if (db.prepare('SELECT 1 FROM facilities WHERE mobile = ?').get(mobile))
    return res.status(409).json({ message: 'This mobile number is already registered.' });
  const id = `F-${rnd(4)}`;
  db.prepare(`INSERT INTO facilities (id,name,facility_type,mobile,email,registration_no,address,status,submitted_at)
              VALUES (?,?,?,?,?,?,?, 'pending', ?)`).run(
    id, name, pick(b, 'facilityType', 'type') || 'Clinic', mobile, pick(b, 'email'),
    pick(b, 'registrationNo', 'registrationNumber'), pick(b, 'address'), now());
  res.status(201).json({ id, facilityId: id, status: 'pending', message: 'Submitted for admin approval.' });
});

v1.post('/auth/register/admin', (req, res) => {
  const b = req.body || {};
  const code = pick(b, 'inviteCode', 'invite', 'code');
  if (code !== ADMIN_INVITE) return res.status(403).json({ message: 'Invalid admin invite code.' });
  const name = pick(b, 'name', 'fullName');
  const mobile = pick(b, 'mobile', 'phone');
  if (!name) return res.status(400).json({ message: 'Name is required.' });
  if (!isMobile(mobile)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
  if (db.prepare('SELECT 1 FROM admins WHERE mobile = ?').get(mobile))
    return res.status(409).json({ message: 'This mobile number is already registered.' });
  const id = `A-${rnd(4)}`;
  const r = String(pick(b, 'role') || 'admin').toLowerCase() === 'auditor' ? 'auditor' : 'admin';
  db.prepare('INSERT INTO admins (id,name,mobile,email,role,created_at) VALUES (?,?,?,?,?,?)').run(id, name, mobile, pick(b, 'email'), r, now());
  res.status(201).json({ id, adminId: id, role: r, status: 'approved' });
});

// ---------- auth: login ----------
v1.post('/auth/login', (req, res) => {
  const { mobile, otp } = req.body || {};
  const want = String((req.body || {}).role || 'patient').toLowerCase();
  if (!isMobile(mobile)) return res.status(400).json({ message: 'Enter a valid 10-digit mobile number.' });
  if (String(otp) !== OTP_CODE) return res.status(401).json({ message: `That OTP isn't right. Use ${OTP_CODE} for this demo.` });
  const notFound = () => res.status(404).json({ message: 'No account found for this number and role.' });

  if (want === 'patient') {
    const p = db.prepare('SELECT * FROM patients WHERE mobile = ?').get(mobile);
    return p ? res.json({ role: 'patient', name: p.name, healthId: p.health_id }) : notFound();
  }
  if (want === 'practitioner' || want === 'doctor') {
    const d = db.prepare('SELECT * FROM practitioners WHERE mobile = ?').get(mobile);
    if (!d) return notFound();
    if (d.status === 'pending') return forbid(res, 'Your registration is waiting for admin approval.');
    if (d.status === 'rejected') return forbid(res, 'Your registration was rejected. Contact the administrator.');
    return res.json({ role: 'practitioner', name: d.name, doctorId: d.id, system: d.system });
  }
  if (want === 'clinic' || want === 'facility') {
    const f = db.prepare('SELECT * FROM facilities WHERE mobile = ?').get(mobile);
    if (!f) return notFound();
    if (f.status === 'pending') return forbid(res, 'Your registration is waiting for admin approval.');
    if (f.status === 'rejected') return forbid(res, 'Your registration was rejected. Contact the administrator.');
    return res.json({ role: want, name: f.name, facilityId: f.id });
  }
  if (want === 'admin' || want === 'auditor') {
    const a = db.prepare('SELECT * FROM admins WHERE mobile = ?').get(mobile);
    return a ? res.json({ role: a.role, name: a.name, adminId: a.id }) : notFound();
  }
  res.status(400).json({ message: 'Unknown role.' });
});

// ---------- doctors / facilities ----------
v1.get('/doctors', (req, res) => {
  res.json(db.prepare(`SELECT id, name, system, status FROM practitioners WHERE status = 'approved' ORDER BY name`).all());
});

v1.get('/facilities/:id/practitioners', (req, res) => {
  if (!db.prepare('SELECT 1 FROM facilities WHERE id = ?').get(req.params.id))
    return res.status(404).json({ message: 'Facility not found.' });
  res.json(db.prepare('SELECT id, name, system, status FROM practitioners WHERE facility_id = ? ORDER BY name').all(req.params.id));
});

// ---------- records ----------
v1.post('/records/extract', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file received.' });
  if (!/^(image\/(jpeg|png)|application\/pdf)$/.test(req.file.mimetype))
    return res.status(400).json({ message: 'Only JPG, PNG or PDF files are allowed.' });
  // DEMO ONLY: fixed sample. Replace with a real OCR / AI reader.
  res.json({
    documentType: req.body.documentType || 'Prescription',
    system: 'Ayurveda',
    problem: 'Nausea, fever',
    diagnosis: '',
    prakriti: 'Vata',
    medicines: [{ name: 'Karpurati Tailam', dose: '2 tabs', timing: 'At bedtime', duration: '5 days' }],
    advice: 'Warm fluids, light diet, adequate rest.',
    readWithAi: false,
    note: 'Demo reader: sample values shown. Please check and correct before saving.',
  });
});

v1.post('/records', (req, res) => {
  const b = req.body || {};
  if (!getPatient(b.healthId)) return res.status(404).json({ message: 'No patient found for this ID.' });
  const r = db.prepare(`INSERT INTO records (health_id,document_type,file_name,system,problem,diagnosis,prakriti,medicines,advice,saved_at)
                        VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    getPatient(b.healthId).health_id, b.documentType || null, b.fileName || null, b.system || 'Ayurveda', b.problem || '',
    b.diagnosis || '', b.prakriti || '', JSON.stringify(Array.isArray(b.medicines) ? b.medicines : []), b.advice || '', now());
  res.status(201).json({ recordId: `R-${r.lastInsertRowid}` });
});

v1.post('/patients/:id/prescriptions', upload.single('file'), (req, res) => {
  const p = getPatient(req.params.id);
  if (!p) return res.status(404).json({ message: 'No patient found for this ID.' });
  if (!req.file) return res.status(400).json({ message: 'No file received.' });
  const r = db.prepare('INSERT INTO uploads (health_id,file_name,mime_type,size,uploaded_at) VALUES (?,?,?,?,?)')
    .run(p.health_id, req.file.originalname, req.file.mimetype, req.file.size, now());
  res.status(201).json({ uploadId: `U-${r.lastInsertRowid}`, fileName: req.file.originalname });
});

// ---------- summary + consent ----------
function sharedWith(healthId) {
  return db.prepare('SELECT doctor_id FROM consents WHERE health_id = ?').all(healthId).map((r) => r.doctor_id);
}

v1.get('/patients/:id/summary', (req, res) => {
  const p = getPatient(req.params.id);
  if (!p) return res.status(404).json({ message: 'No record found for this ID.' });
  if (role(req) === 'practitioner') {
    const did = req.get('X-Doctor-Id');
    if (!did || !sharedWith(p.health_id).includes(did))
      return forbid(res, 'The patient has not shared the record with you.');
  }
  const records = db.prepare('SELECT * FROM records WHERE health_id = ? ORDER BY record_id').all(p.health_id).map((r) => ({
    recordId: `R-${r.record_id}`, savedAt: r.saved_at, healthId: r.health_id, documentType: r.document_type, fileName: r.file_name,
    system: r.system, problem: r.problem, diagnosis: r.diagnosis, prakriti: r.prakriti,
    medicines: JSON.parse(r.medicines || '[]'), advice: r.advice,
  }));
  const uploads = db.prepare('SELECT * FROM uploads WHERE health_id = ? ORDER BY upload_id').all(p.health_id)
    .map((u) => ({ uploadId: `U-${u.upload_id}`, fileName: u.file_name, uploadedAt: u.uploaded_at }));
  res.json({ name: p.name, healthId: p.health_id, consultationId: p.consultation_id, records, uploads, sharedWith: sharedWith(p.health_id) });
});

v1.post('/patients/:id/consents', (req, res) => {
  const p = getPatient(req.params.id);
  if (!p) return res.status(404).json({ message: 'No record found for this ID.' });
  if (role(req) && role(req) !== 'patient') return forbid(res, 'Only the patient can change sharing.');
  const ids = Array.isArray((req.body || {}).doctorIds) ? req.body.doctorIds : [];
  const valid = ids.filter((d) => db.prepare(`SELECT 1 FROM practitioners WHERE id = ? AND status = 'approved'`).get(d));
  db.transaction(() => {
    db.prepare('DELETE FROM consents WHERE health_id = ?').run(p.health_id);
    const ins = db.prepare('INSERT INTO consents VALUES (?,?,?)');
    valid.forEach((d) => ins.run(p.health_id, d, now()));
  })();
  res.json({ sharedWith: valid });
});

// ---------- Ayurveda forms ----------
const PARTS = ['prakriti', 'vikriti', 'diagnosis', 'examination', 'dashavidha-pariksha', 'therapy'];
const PRACTITIONER_ONLY = ['diagnosis'];

function latestPart(cid, part) {
  const r = db.prepare('SELECT * FROM ayurveda_parts WHERE consultation_id = ? AND part = ? ORDER BY version DESC LIMIT 1').get(cid, part);
  return r ? { ...JSON.parse(r.data), _version: r.version, _savedAt: r.saved_at } : null;
}
const DOSHAS = ['Vata', 'Pitta', 'Kapha'];
const doshasIn = (s) => DOSHAS.filter((d) => new RegExp(d, 'i').test(String(s || '')));

const ayurveda = express.Router();

ayurveda.get('/consultations/:cid/prakriti-vikriti', (req, res) => {
  const pk = latestPart(req.params.cid, 'prakriti');
  const vk = latestPart(req.params.cid, 'vikriti');
  if (!pk || !vk) return res.status(404).json({ message: 'Record both Prakriti and Vikriti first.' });
  const P = doshasIn(pk.prakriti), V = doshasIn(vk.vikriti);
  const differences = [
    ...P.filter((d) => !V.includes(d)).map((d) => `${d} (Prakriti) is not currently aggravated`),
    ...V.filter((d) => !P.includes(d)).map((d) => `${d} is aggravated beyond the natural constitution`),
  ];
  res.json({ prakriti: pk.prakriti, vikriti: vk.vikriti, differences });
});

ayurveda.get('/consultations/:cid/:part', (req, res) => {
  if (!PARTS.includes(req.params.part)) return res.status(404).json({ message: 'Unknown form.' });
  const d = latestPart(req.params.cid, req.params.part);
  return d ? res.json(d) : res.status(404).json({ message: 'Nothing saved yet.' });
});

ayurveda.post('/consultations/:cid/:part', (req, res) => {
  const { cid, part } = req.params;
  if (!PARTS.includes(part)) return res.status(404).json({ message: 'Unknown form.' });
  if (!db.prepare('SELECT 1 FROM patients WHERE consultation_id = ?').get(cid))
    return res.status(404).json({ message: 'Consultation not found.' });
  if (PRACTITIONER_ONLY.includes(part) && role(req) !== 'practitioner') return forbid(res);

  const key = req.get('Idempotency-Key');
  const route = `${cid}/${part}`;
  if (key) {
    const prev = db.prepare('SELECT * FROM idempotency WHERE key=? AND route=?').get(key, route);
    if (prev) return res.status(prev.status).json(JSON.parse(prev.response));
  }
  const body = req.body || {};
  if (!Object.keys(body).length) return res.status(400).json({ message: 'Nothing to save.' });

  const last = db.prepare('SELECT MAX(version) v FROM ayurveda_parts WHERE consultation_id = ? AND part = ?').get(cid, part).v || 0;
  const savedAt = now();
  db.prepare('INSERT INTO ayurveda_parts (consultation_id,part,version,data,saved_by,saved_at) VALUES (?,?,?,?,?,?)')
    .run(cid, part, last + 1, JSON.stringify(body), req.get('X-Doctor-Id') || role(req) || null, savedAt);
  const out = { ok: true, consultationId: cid, version: last + 1, savedAt };
  if (key) db.prepare('INSERT INTO idempotency VALUES (?,?,?,?)').run(key, route, 201, JSON.stringify(out));
  res.status(201).json(out);
});

v1.use('/ayurveda', ayurveda);
v1.use('/', ayurveda); // frontend may call /v1/consultations/... directly

// ---------- admin ----------
const adminOnly = (req, res, next) => (['admin', 'auditor'].includes(role(req)) ? next() : forbid(res, 'Administrators only.'));

v1.get('/admin/pending', adminOnly, (req, res) => {
  const p = db.prepare(`SELECT id, name, system, registration_no, submitted_at FROM practitioners WHERE status='pending'`).all()
    .map((r) => ({ kind: 'practitioner', id: r.id, name: r.name, detail: `${r.system} · Reg ${r.registration_no || '-'}`, submittedAt: r.submitted_at }));
  const f = db.prepare(`SELECT id, name, facility_type, registration_no, submitted_at FROM facilities WHERE status='pending'`).all()
    .map((r) => ({ kind: 'facility', id: r.id, name: r.name, detail: `${r.facility_type || 'Facility'} · Reg ${r.registration_no || '-'}`, submittedAt: r.submitted_at }));
  res.json([...p, ...f].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)));
});

v1.get('/admin/audit', adminOnly, (req, res) => {
  res.json(db.prepare('SELECT at, by_name, decision, kind, target_id FROM audit_log ORDER BY id DESC').all()
    .map((r) => ({ at: r.at, by: r.by_name, decision: r.decision, kind: r.kind, targetId: r.target_id })));
});

v1.post('/admin/decisions', adminOnly, (req, res) => {
  if (role(req) === 'auditor') return forbid(res, 'Auditors can view but cannot approve or reject.');
  const { kind, id, decision } = req.body || {};
  if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'Decision must be approve or reject.' });
  const table = kind === 'practitioner' ? 'practitioners' : kind === 'facility' || kind === 'clinic' ? 'facilities' : null;
  if (!table) return res.status(400).json({ message: 'Unknown kind.' });
  const row = db.prepare(`SELECT status FROM ${table} WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ message: 'Not found.' });
  if (row.status !== 'pending') return res.status(409).json({ message: `Already ${row.status}.` });
  const status = decision === 'approve' ? 'approved' : 'rejected';
  const admin = db.prepare('SELECT name FROM admins WHERE id = ?').get(req.get('X-Admin-Id') || '');
  db.transaction(() => {
    db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).run(status, id);
    db.prepare('INSERT INTO audit_log (at,by_name,decision,kind,target_id) VALUES (?,?,?,?,?)')
      .run(now(), admin ? admin.name : 'Demo Administrator', decision, kind, id);
  })();
  res.json({ status });
});

app.get('/', (req, res) => res.json({ service: 'ayush-backend', ok: true }));
app.use('/v1', v1);

// ---------- errors ----------
app.use((req, res) => res.status(404).json({ message: 'Not found.' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON' });
  if (err instanceof multer.MulterError) return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 10 MB.' : err.message });
  console.error(err);
  res.status(500).json({ message: 'Server error.' });
});

if (require.main === module) app.listen(PORT, () => console.log(`AYUSH backend running at http://localhost:${PORT}`));
module.exports = app;
