import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { platform } from '../api/client';
import TopBar from '../components/TopBar';
import { setSession } from '../utils/session';
import { onlyDigits } from '../utils/aadhaar';

const ROLES = [['patient', 'Patient'], ['practitioner', 'Doctor'], ['facility', 'Clinic / Hospital'], ['admin', 'Admin / Auditor']];
const HOME = { patient: '/patient/add', practitioner: '/doctor', facility: '/clinic', admin: '/admin' };
const HINT = {
  patient: 'Patients: create your record first.',
  practitioner: 'Demo doctor: 9000000001',
  facility: 'Demo clinic: 9000000005',
  admin: 'Demo admin: 9000000009 · auditor: 9000000008',
};

export default function Landing() {
  const nav = useNavigate();
  const [role, setRole] = useState('patient');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!/^[6-9]\d{9}$/.test(mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
    if (!/^\d{6}$/.test(otp)) e.otp = 'Enter the 6-digit OTP';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await platform.post('/auth/login', { mobile, otp, role });
      setSession({ ...r.data, mobile });
      nav(HOME[r.data.role]);
    } catch (err) {
      const c = err.response?.status;
      setMsg(c && c < 500 ? err.response.data?.message || 'Please check the details.' : 'Could not reach the server. Retry in a moment.');
    } finally { setBusy(false); }
  };

  return (
    <><TopBar /><div className="container"><div className="card">
      <h2>Your AYUSH health history, in one place</h2>
      <p className="muted">Ayurveda, Yoga &amp; Naturopathy, Unani, Siddha and Homoeopathy.</p>
      <div className="field"><label>Sign in as</label>
        <div className="seg">{ROLES.map(([k, l]) => (
          <button key={k} type="button" className={role === k ? 'on' : ''} onClick={() => { setRole(k); setMsg(''); setErrors({}); }}>{l}</button>))}</div></div>
      {msg && <div className="banner err">{msg}</div>}
      <form onSubmit={submit} noValidate>
        <div className={`field ${errors.mobile ? 'invalid' : ''}`}><label htmlFor="mobile">Mobile number</label>
          <input id="mobile" inputMode="numeric" value={mobile} onChange={(e) => { setMobile(onlyDigits(e.target.value, 10)); setMsg(''); }} />
          {errors.mobile && <span className="error-text">{errors.mobile}</span>}</div>
        <div className={`field ${errors.otp ? 'invalid' : ''}`}><label htmlFor="otp">OTP (demo: 123456)</label>
          <input id="otp" inputMode="numeric" value={otp} onChange={(e) => { setOtp(onlyDigits(e.target.value, 6)); setMsg(''); }} />
          {errors.otp && <span className="error-text">{errors.otp}</span>}</div>
        <button type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Sign in'}</button>
      </form>
      <p className="muted" style={{ marginTop: 14 }}>{HINT[role]}</p>
      <p>New here? <Link to="/register">Create an account</Link></p>
    </div></div></>
  );
}
