import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { platform } from '../../api/client';
import TopBar from '../../components/TopBar';
import { setSession } from '../../utils/session';
import { aadhaarError, formatAadhaar, onlyDigits } from '../../utils/aadhaar';

export default function Patient() {
  const nav = useNavigate();
  const [f, setF] = useState({ mobile: '', aadhaar: '', otp: '', consent: false });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setMsg(''); };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!/^[6-9]\d{9}$/.test(f.mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
    const a = aadhaarError(f.aadhaar); if (a) e.aadhaar = a;
    if (!/^\d{6}$/.test(f.otp)) e.otp = 'Enter the 6-digit OTP';
    if (!f.consent) e.consent = 'Please agree to link your Aadhaar';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await platform.post('/auth/register', { mobile: f.mobile, otp: f.otp, aadhaar: f.aadhaar });
      setF((p) => ({ ...p, aadhaar: '', otp: '' }));
      setCreated({ ...r.data, mobile: f.mobile });
    } catch (err) {
      const c = err.response?.status;
      setMsg(c && c < 500 ? err.response.data?.message || 'Please check the details.' : 'Could not reach the server. Retry in a moment.');
    } finally { setBusy(false); }
  };

  if (created) {
    return (
      <><TopBar /><div className="container"><div className="card center">
        <h2>Your health record is ready</h2>
        <p className="muted">Aadhaar ({created.maskedAadhaar}) is linked. Doctors you choose can use this ID to open your record.</p>
        <div className="hid">{created.healthId}</div>
        <p className="muted">Health Record ID · {created.name}</p>
        <button type="button" className="secondary" onClick={() => navigator.clipboard?.writeText(created.healthId)}>Copy ID</button>{' '}
        <button type="button" onClick={() => { setSession({ role: 'patient', name: created.name, healthId: created.healthId, mobile: created.mobile }); nav('/patient/add'); }}>Continue</button>
      </div></div></>
    );
  }

  return (
    <><TopBar /><div className="container"><div className="card">
      <Link to="/register" className="muted">← Choose a different account type</Link>
      <h2 style={{ marginTop: 8 }}>Patient registration</h2>
      <p className="muted">Your name and age come from the verified Aadhaar, so you don't type them.</p>
      {msg && <div className="banner err">{msg}</div>}
      <form onSubmit={submit} noValidate>
        <div className={`field ${errors.mobile ? 'invalid' : ''}`}><label htmlFor="m">Mobile number *</label>
          <input id="m" inputMode="numeric" value={f.mobile} onChange={(e) => set('mobile', onlyDigits(e.target.value, 10))} />
          {errors.mobile && <span className="error-text">{errors.mobile}</span>}</div>
        <div className={`field ${errors.aadhaar ? 'invalid' : ''}`}><label htmlFor="a">Aadhaar number (12 digits) *</label>
          <input id="a" inputMode="numeric" autoComplete="off" placeholder="1234 5678 9012" maxLength={14} value={formatAadhaar(f.aadhaar)} onChange={(e) => set('aadhaar', onlyDigits(e.target.value))} />
          <span className="muted">{f.aadhaar.length}/12 digits</span>
          {errors.aadhaar && <span className="error-text">{errors.aadhaar}</span>}</div>
        <div className={`field ${errors.otp ? 'invalid' : ''}`}><label htmlFor="o">OTP * (demo: 123456)</label>
          <input id="o" inputMode="numeric" maxLength={6} value={f.otp} onChange={(e) => set('otp', onlyDigits(e.target.value, 6))} />
          {errors.otp && <span className="error-text">{errors.otp}</span>}</div>
        <div className={`field ${errors.consent ? 'invalid' : ''}`}>
          <label className="check"><input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} />I agree to link my Aadhaar to create my health record ID.</label>
          {errors.consent && <span className="error-text">{errors.consent}</span>}</div>
        <button type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Create my record'}</button>
      </form>
    </div></div></>
  );
}
