// Mock of the platform + Ayurveda backend so the frontend can be tested alone.
// Run: node mock/server.cjs   (http://localhost:4000)
// NOTE: the "prescription reader" below returns a fixed sample. The real
// reader (OCR / AI) must be built by the backend / AI service team.
const http = require('http');

const users = {};     // mobile -> healthId
const patients = {};  // healthId -> patient
const ayu = {};       // consultationId -> saved Ayurveda parts
const now = () => new Date().toISOString();
const practitioners = {
  'D-1': { id: 'D-1', name: 'Dr. Ayurveda Demo', system: 'Ayurveda', mobile: '9000000001', registrationNo: 'KAR/AYU/0001', facilityId: 'HF-0001-0001', status: 'approved' },
  'D-2': { id: 'D-2', name: 'Dr. Siddha Demo', system: 'Siddha', mobile: '9000000002', registrationNo: 'TN/SID/0002', facilityId: 'HF-0001-0001', status: 'approved' },
};
const facilities = {
  'HF-0001-0001': { id: 'HF-0001-0001', name: 'AYUSH Demo Clinic', facilityType: 'Clinic', mobile: '9000000005', licenceNo: 'KA-CL-0001', status: 'approved' },
};
const admins = {
  'AD-0001': { id: 'AD-0001', name: 'Demo Administrator', adminType: 'Administrator', mobile: '9000000009' },
  'AD-0002': { id: 'AD-0002', name: 'Demo Auditor', adminType: 'Auditor', mobile: '9000000008' },
};
const audit = [];
const INVITE = 'AYUSH-ADMIN-2026';
const approvedDoctors = () => Object.values(practitioners).filter((x) => x.status === 'approved');
const has = (v) => typeof v === 'string' && v.trim().length > 0;
const mobileOk = (v) => /^[6-9]\d{9}$/.test(v || '');
const emailOk = (v) => /^\S+@\S+\.\S+$/.test(v || '');
const rid = (prefix) => `${prefix}-${grp(4)}-${grp(4)}`;
const mobileTaken = (m) => !!users[m] || Object.values(practitioners).some((x) => x.mobile === m)
  || Object.values(facilities).some((x) => x.mobile === m) || Object.values(admins).some((x) => x.mobile === m);
let seq = 1000;

const grp = (n) => String(Math.floor(Math.random() * 10 ** n)).padStart(n, '0');
const newHealthId = () => `91-${grp(4)}-${grp(4)}-${grp(4)}`;

const send = (res, code, body) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-Id,X-Role,X-Doctor-Id,X-Admin-Id,Idempotency-Key',
  });
  res.end(JSON.stringify(body));
};
const readBody = (req, cb) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => cb(Buffer.concat(c))); };
const json = (b) => { try { return JSON.parse(b.toString() || '{}'); } catch (e) { return null; } };

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const path = new URL(req.url, 'http://x').pathname;
  const role = req.headers['x-role'];
  let m;

  if (req.method === 'POST' && path === '/v1/auth/register') {
    return readBody(req, (b) => {
      const d = json(b);
      if (!d) return send(res, 400, { message: 'Invalid request.' });
      if (!/^[6-9]\d{9}$/.test(d.mobile || '')) return send(res, 400, { message: 'Enter a valid 10-digit mobile number.' });
      if (!/^[2-9]\d{11}$/.test(d.aadhaar || '')) return send(res, 400, { message: 'Aadhaar number must be exactly 12 digits.' });
      if (d.otp !== '123456') return send(res, 401, { message: "That OTP isn't right. Use 123456 for this demo." });
      if (users[d.mobile]) return send(res, 409, { message: 'This mobile number already has a record. Sign in instead.' });
      const healthId = newHealthId();
      seq += 1;
      // The Aadhaar number is NOT stored. A real system verifies it with ABDM and keeps only the ABHA link.
      patients[healthId] = { healthId, name: 'Demo Patient', mobile: d.mobile, consultationId: `C-${seq}`, records: [], uploads: [], sharedWith: [] };
      users[d.mobile] = healthId;
      return send(res, 201, { healthId, name: 'Demo Patient', maskedAadhaar: `XXXX XXXX ${d.aadhaar.slice(-4)}` });
    });
  }

  // ---- Registration: one endpoint and one rule set per role ----
  if (req.method === 'POST' && path === '/v1/auth/register/practitioner') {
    return readBody(req, (b) => {
      const d = json(b) || {};
      const e = {};
      if (!has(d.name)) e.name = 'Full name is required';
      if (!has(d.system)) e.system = 'Choose your system of medicine';
      if (!has(d.registrationNo)) e.registrationNo = 'Council registration number is required';
      if (!has(d.council)) e.council = 'Registering council is required';
      if (!has(d.qualification)) e.qualification = 'Qualification is required';
      if (!mobileOk(d.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
      if (!emailOk(d.email)) e.email = 'Enter a valid email';
      if (!has(d.certificateName)) e.certificate = 'Upload your registration certificate';
      if (Object.keys(e).length) return send(res, 400, { message: 'Please correct the highlighted fields.', errors: e });
      if (d.otp !== '123456') return send(res, 401, { message: "That OTP isn't right. Use 123456 for this demo." });
      if (mobileTaken(d.mobile)) return send(res, 409, { message: 'This mobile number is already registered.' });
      if (has(d.facilityId) && !facilities[d.facilityId]) return send(res, 400, { message: 'Clinic / Hospital ID not found.' });
      const id = rid('DR');
      practitioners[id] = { id, name: d.name, system: d.system, mobile: d.mobile, registrationNo: d.registrationNo, facilityId: d.facilityId || '', status: 'pending', submittedAt: now() };
      return send(res, 201, { id, idLabel: 'Practitioner ID', status: 'pending', message: 'An administrator will verify your council registration before you can sign in.' });
    });
  }

  if (req.method === 'POST' && path === '/v1/auth/register/facility') {
    return readBody(req, (b) => {
      const d = json(b) || {};
      const e = {};
      if (!has(d.name)) e.name = 'Facility name is required';
      if (!has(d.facilityType)) e.facilityType = 'Choose the facility type';
      if (!Array.isArray(d.systems) || !d.systems.length) e.systems = 'Select at least one system of medicine';
      if (!has(d.licenceNo)) e.licenceNo = 'Licence / registration number is required';
      if (!has(d.address)) e.address = 'Address is required';
      if (!has(d.state)) e.state = 'State is required';
      if (!/^\d{6}$/.test(d.pincode || '')) e.pincode = 'Pincode must be 6 digits';
      if (!has(d.contactPerson)) e.contactPerson = 'Contact person is required';
      if (!mobileOk(d.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
      if (!has(d.certificateName)) e.certificate = 'Upload the licence document';
      if (Object.keys(e).length) return send(res, 400, { message: 'Please correct the highlighted fields.', errors: e });
      if (d.otp !== '123456') return send(res, 401, { message: "That OTP isn't right. Use 123456 for this demo." });
      if (mobileTaken(d.mobile)) return send(res, 409, { message: 'This mobile number is already registered.' });
      const id = rid('HF');
      facilities[id] = { id, name: d.name, facilityType: d.facilityType, mobile: d.mobile, licenceNo: d.licenceNo, status: 'pending', submittedAt: now() };
      return send(res, 201, { id, idLabel: 'Facility ID', status: 'pending', message: 'An administrator will verify your licence before you can sign in. Share the Facility ID with your doctors.' });
    });
  }

  if (req.method === 'POST' && path === '/v1/auth/register/admin') {
    return readBody(req, (b) => {
      const d = json(b) || {};
      const e = {};
      if (!has(d.name)) e.name = 'Full name is required';
      if (!has(d.adminType)) e.adminType = 'Choose Administrator or Auditor';
      if (!has(d.employeeId)) e.employeeId = 'Employee ID is required';
      if (!has(d.department)) e.department = 'Department is required';
      if (!emailOk(d.email)) e.email = 'Enter your official email';
      if (!mobileOk(d.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
      if (Object.keys(e).length) return send(res, 400, { message: 'Please correct the highlighted fields.', errors: e });
      if (d.inviteCode !== INVITE) return send(res, 403, { message: 'That invite code is not valid.' });
      if (d.otp !== '123456') return send(res, 401, { message: "That OTP isn't right. Use 123456 for this demo." });
      if (mobileTaken(d.mobile)) return send(res, 409, { message: 'This mobile number is already registered.' });
      const id = rid('AD');
      admins[id] = { id, name: d.name, adminType: d.adminType, mobile: d.mobile };
      return send(res, 201, { id, idLabel: 'Admin ID', status: 'active', message: 'Your account is active. You can sign in now.' });
    });
  }

  // ---- Admin: approvals + audit ----
  if (req.method === 'GET' && path === '/v1/admin/pending') {
    if (role !== 'admin') return send(res, 403, { message: 'Admins only.' });
    return send(res, 200, [
      ...Object.values(practitioners).filter((x) => x.status === 'pending').map((x) => ({ kind: 'practitioner', id: x.id, name: x.name, detail: `${x.system} · Reg ${x.registrationNo}`, submittedAt: x.submittedAt })),
      ...Object.values(facilities).filter((x) => x.status === 'pending').map((x) => ({ kind: 'facility', id: x.id, name: x.name, detail: `${x.facilityType} · Licence ${x.licenceNo}`, submittedAt: x.submittedAt })),
    ]);
  }
  if (req.method === 'GET' && path === '/v1/admin/audit') {
    if (role !== 'admin') return send(res, 403, { message: 'Admins only.' });
    return send(res, 200, audit);
  }
  if (req.method === 'POST' && path === '/v1/admin/decisions') {
    return readBody(req, (b) => {
      if (role !== 'admin') return send(res, 403, { message: 'Admins only.' });
      const adm = admins[req.headers['x-admin-id']];
      if (!adm || adm.adminType !== 'Administrator') return send(res, 403, { message: 'Auditors can view but cannot approve or reject.' });
      const d = json(b) || {};
      const t = (d.kind === 'facility' ? facilities : practitioners)[d.id];
      if (!t) return send(res, 404, { message: 'Request not found.' });
      t.status = d.decision === 'approve' ? 'approved' : 'rejected';
      audit.push({ at: now(), by: adm.name, decision: d.decision, kind: d.kind, targetId: d.id });
      return send(res, 200, { status: t.status });
    });
  }
  if (req.method === 'GET' && (m = path.match(/^\/v1\/facilities\/([^/]+)\/practitioners$/))) {
    return send(res, 200, Object.values(practitioners).filter((x) => x.facilityId === m[1]).map(({ id, name, system, status }) => ({ id, name, system, status })));
  }

  if (req.method === 'POST' && path === '/v1/auth/login') {
    return readBody(req, (b) => {
      const d = json(b);
      if (!d) return send(res, 400, { message: 'Invalid request.' });
      if (d.otp !== '123456') return send(res, 401, { message: "That OTP isn't right. Use 123456 for this demo." });
      if (d.role === 'practitioner') {
        const doc = Object.values(practitioners).find((x) => x.mobile === d.mobile);
        if (!doc) return send(res, 404, { message: 'No doctor account for this number.' });
        if (doc.status === 'pending') return send(res, 403, { message: 'Your registration is waiting for verification by an administrator.' });
        if (doc.status === 'rejected') return send(res, 403, { message: 'Your registration was not approved. Contact the administrator.' });
        return send(res, 200, { role: 'practitioner', name: doc.name, doctorId: doc.id, system: doc.system });
      }
      if (d.role === 'facility') {
        const f = Object.values(facilities).find((x) => x.mobile === d.mobile);
        if (!f) return send(res, 404, { message: 'No clinic / hospital account for this number.' });
        if (f.status !== 'approved') return send(res, 403, { message: f.status === 'pending' ? 'Your registration is waiting for verification by an administrator.' : 'Your registration was not approved.' });
        return send(res, 200, { role: 'facility', name: f.name, facilityId: f.id });
      }
      if (d.role === 'admin') {
        const ad = Object.values(admins).find((x) => x.mobile === d.mobile);
        if (!ad) return send(res, 404, { message: 'No admin account for this number.' });
        return send(res, 200, { role: 'admin', name: ad.name, adminType: ad.adminType, adminId: ad.id });
      }
      const id = users[d.mobile];
      if (!id) return send(res, 404, { message: 'No record for this number. Choose Create my record.' });
      return send(res, 200, { role: 'patient', name: patients[id].name, healthId: id });
    });
  }

  if (req.method === 'GET' && path === '/v1/doctors') return send(res, 200, approvedDoctors().map(({ id, name, system }) => ({ id, name, system })));

  if (req.method === 'POST' && path === '/v1/records/extract') {
    return readBody(req, () => send(res, 200, {
      documentType: "Doctor's prescription", system: 'Ayurveda', problem: 'Nausea, fever', diagnosis: '', prakriti: 'Vata',
      medicines: [
        { name: 'Karpurati Tailam', dose: '2 tabs', timing: 'At bedtime', duration: '7 days' },
        { name: 'Avipattikar Churna', dose: '1 tsp', timing: 'Once daily', duration: '21 days' },
      ],
      advice: 'Take with warm water.', readWithAi: false,
      note: 'Read without AI. Handwriting is read much better with the AI reader switched on.',
    }));
  }

  if (req.method === 'POST' && path === '/v1/records') {
    return readBody(req, (b) => {
      const d = json(b);
      const p = d && patients[d.healthId];
      if (!p) return send(res, 404, { message: 'Patient not found.' });
      const savedAt = new Date().toISOString();
      const rec = { recordId: `R-${p.records.length + 1}`, savedAt, ...d };
      p.records.push(rec);
      p.uploads.push({ fileName: d.fileName, documentType: d.documentType, savedAt });
      return send(res, 201, { recordId: rec.recordId });
    });
  }

  if (req.method === 'GET' && (m = path.match(/^\/v1\/patients\/([^/]+)\/summary$/))) {
    const p = patients[m[1]];
    if (!p) return send(res, 404, { message: 'No record found for this ID.' });
    if (role === 'practitioner' && !p.sharedWith.includes(req.headers['x-doctor-id'])) {
      return send(res, 403, { message: 'The patient has not shared the record with you.' });
    }
    return send(res, 200, {
      name: p.name, healthId: p.healthId, consultationId: p.consultationId, records: p.records,
      uploads: p.uploads, sharedWith: p.sharedWith, lastExtracted: p.records[p.records.length - 1] || null,
    });
  }

  if (req.method === 'POST' && (m = path.match(/^\/v1\/patients\/([^/]+)\/consents$/))) {
    return readBody(req, (b) => {
      const d = json(b);
      const p = patients[m[1]];
      if (!p) return send(res, 404, { message: 'No record found.' });
      if (role !== 'patient') return send(res, 403, { message: 'Only the patient can change sharing.' });
      p.sharedWith = (d && Array.isArray(d.doctorIds) ? d.doctorIds : []).filter((id) => approvedDoctors().some((x) => x.id === id));
      return send(res, 200, { sharedWith: p.sharedWith });
    });
  }

  // ---- Ayurveda service: /v1/ayurveda ----
  if ((m = path.match(/^\/v1\/ayurveda\/consultations\/([^/]+)\/([^/]+)$/))) {
    const [, id, part] = m;
    ayu[id] = ayu[id] || {};

    if (req.method === 'GET' && part === 'prakriti-vikriti') {
      const p = ayu[id].prakriti && ayu[id].prakriti.prakriti;
      const v = ayu[id].vikriti && ayu[id].vikriti.vikriti;
      if (!p || !v) return send(res, 404, { message: 'Record both Prakriti and Vikriti first.' });
      const ps = p.split(' ')[0].split('-'), vs = v.split(' ')[0].split('-');
      const differences = [
        ...vs.filter((x) => !ps.includes(x)).map((x) => `${x} is vitiated but not part of the Prakriti`),
        ...ps.filter((x) => !vs.includes(x)).map((x) => `${x} (Prakriti) is not currently aggravated`),
      ];
      return send(res, 200, { prakriti: p, vikriti: v, differences });
    }
    if (req.method === 'POST') {
      return readBody(req, (b) => {
        if (part === 'diagnosis' && role !== 'practitioner') return send(res, 403, { message: 'Forbidden' });
        const d = json(b);
        if (!d) return send(res, 400, { message: 'Invalid JSON' });
        if (!Object.keys(d).length) return send(res, 400, { message: 'Empty body' });
        ayu[id][part] = d; // a real backend keeps versions, not overwrite
        return send(res, 201, { ok: true, consultationId: id, savedAt: new Date().toISOString() });
      });
    }
    return send(res, 405, { message: 'Method not allowed' });
  }

  return send(res, 404, { message: 'Not found' });
}).listen(4000, () => console.log('Mock API on http://localhost:4000'));
