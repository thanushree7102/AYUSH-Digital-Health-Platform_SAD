import { useState } from 'react';
import { Link } from 'react-router-dom';
import { platform } from '../api/client';
import Field from './Field';
import TopBar from './TopBar';
import { onlyDigits } from '../utils/aadhaar';

// One config-driven form. Each role passes its OWN fields, so the pages differ.
export default function RoleRegister({ title, intro, endpoint, fields, steps }) {
  const init = Object.fromEntries(fields.map((f) => [f.name, f.type === 'multiselect' ? [] : '']));
  const [v, setV] = useState({ ...init, otp: '', declare: false });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k, val) => { setV((p) => ({ ...p, [k]: val })); setMsg(''); };

  const validate = () => {
    const e = {};
    fields.forEach((f) => {
      const x = v[f.name];
      if (f.required && (Array.isArray(x) ? !x.length : !String(x).trim())) e[f.name] = `${f.label} is required`;
      else if (f.pattern && x && !f.pattern.test(x)) e[f.name] = f.patternMsg;
    });
    if (steps.certificate && !file) e.certificate = steps.certificate.error;
    if (!/^\d{6}$/.test(v.otp)) e.otp = 'Enter the 6-digit OTP';
    if (!v.declare) e.declare = 'Please accept the declaration';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const { declare, ...body } = v;
      if (file) body.certificateName = file.name;
      const r = await platform.post(endpoint, body);
      setDone(r.data);
    } catch (err) {
      const c = err.response?.status;
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      setMsg(c && c < 500 ? err.response.data?.message || 'Please check the details.' : 'Could not reach the server. Retry in a moment.');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <>
        <TopBar />
        <div className="container"><div className="card center">
          <h2>{done.status === 'pending' ? 'Registration submitted' : 'Account created'}</h2>
          <p className="muted">{done.message}</p>
          <div className="hid">{done.id}</div>
          <p className="muted">{done.idLabel}</p>
          {done.status === 'pending' && <div className="banner info">Status: waiting for admin verification. You cannot sign in until approved.</div>}
          <Link to="/"><button type="button">Go to sign in</button></Link>
        </div></div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="container"><div className="card">
        <Link to="/register" className="muted">← Choose a different account type</Link>
        <h2 style={{ marginTop: 8 }}>{title}</h2>
        <p className="muted">{intro}</p>
        {msg && <div className="banner err">{msg}</div>}
        <form onSubmit={submit} noValidate>
          {fields.map((f) => (
            <Field key={f.name} field={f} value={v[f.name]} error={errors[f.name]}
              onChange={(n, val) => set(n, f.digits ? onlyDigits(val, f.digits) : val)} />
          ))}
          {steps.certificate && (
            <div className={`field ${errors.certificate ? 'invalid' : ''}`}>
              <label>{steps.certificate.label} *</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { setFile(e.target.files[0] || null); setMsg(''); }} />
              {errors.certificate && <span className="error-text">{errors.certificate}</span>}
            </div>
          )}
          <div className={`field ${errors.otp ? 'invalid' : ''}`}>
            <label htmlFor="otp">Mobile OTP * (demo: 123456)</label>
            <input id="otp" inputMode="numeric" maxLength={6} value={v.otp} onChange={(e) => set('otp', onlyDigits(e.target.value, 6))} />
            {errors.otp && <span className="error-text">{errors.otp}</span>}
          </div>
          <div className={`field ${errors.declare ? 'invalid' : ''}`}>
            <label className="check"><input type="checkbox" checked={v.declare} onChange={(e) => set('declare', e.target.checked)} />{steps.declaration}</label>
            {errors.declare && <span className="error-text">{errors.declare}</span>}
          </div>
          <button type="submit" disabled={busy}>{busy ? 'Submitting...' : steps.submit}</button>
        </form>
      </div></div>
    </>
  );
}
