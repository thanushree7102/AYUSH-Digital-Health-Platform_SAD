import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platform } from '../api/client';
import Field from '../components/Field';
import Steps from '../components/Steps';
import useDraft from '../hooks/useDraft';
import { formatIST } from '../utils/time';

// Step 1 of 2: register the patient only. (Chief complaint is recorded later
// by the practitioner in the Ayurveda case sheet, not at registration.)
const fields = [
  { name: 'fullName', label: 'Full name', required: true },
  { name: 'age', label: 'Age', type: 'number', required: true },
  { name: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male', 'Other'], required: true },
  { name: 'phone', label: 'Mobile number', required: true },
  { name: 'email', label: 'Email (optional)', type: 'email' },
  { name: 'address', label: 'Address (optional)', type: 'textarea' },
];
const empty = Object.fromEntries(fields.map((f) => [f.name, '']));

export default function Register() {
  const nav = useNavigate();
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle' });
  const [dirty, setDirty] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
  const idemKey = useRef(crypto.randomUUID());

  const { savedAt, load, clear } = useDraft('draft:register', values, dirty);
  useEffect(() => { setPendingDraft(load()); /* eslint-disable-next-line */ }, []);

  const change = (name, val) => { setValues((v) => ({ ...v, [name]: val })); setDirty(true); setStatus({ state: 'idle' }); };

  const validate = () => {
    const e = {};
    fields.forEach((f) => { if (f.required && !String(values[f.name]).trim()) e[f.name] = `${f.label} is required`; });
    if (values.phone && !/^[6-9]\d{9}$/.test(values.phone.trim())) e.phone = 'Enter a valid 10-digit mobile number';
    const age = Number(values.age);
    if (values.age && (!Number.isInteger(age) || age < 0 || age > 120)) e.age = 'Enter an age between 0 and 120';
    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) e.email = 'Enter a valid email address';
    return e;
  };

  const submit = async (e) => {
    if (e) e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus({ state: 'saving' });
    try {
      const r = await platform.post('/patients/register', values, { headers: { 'Idempotency-Key': idemKey.current } });
      sessionStorage.setItem('patient', JSON.stringify({
        name: values.fullName, patientId: r.data.patientId, consultationId: r.data.consultationId,
      }));
      clear();
      nav('/register/prescription');
    } catch (err) {
      const code = err.response?.status;
      setStatus({
        state: 'error',
        message: code === 400 || code === 422
          ? err.response.data?.message || 'Some details are invalid.'
          : 'Could not register. Check your connection and retry.',
        retry: true,
      });
    }
  };

  return (
    <div className="register-wrap">
      <div className="card">
        <Steps current={1} />
        <h2>Patient registration</h2>
        <p className="muted">Enter the patient's basic details. You can upload a prescription in the next step.</p>

        {pendingDraft && (
          <div className="banner info">
            Unsaved details found ({formatIST(pendingDraft.at)}).{' '}
            <button type="button" onClick={() => { setValues({ ...empty, ...pendingDraft.values }); setDirty(true); setPendingDraft(null); }}>Resume</button>
            <button type="button" className="secondary" onClick={() => { clear(); setPendingDraft(null); }}>Discard</button>
          </div>
        )}
        {status.state === 'error' && (
          <div className="banner err">
            {status.message} {status.retry && <button type="button" onClick={submit}>Retry</button>}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <div className="grid2">
            {fields.slice(0, 5).map((f) => (
              <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={change} />
            ))}
          </div>
          {fields.slice(5).map((f) => (
            <Field key={f.name} field={f} value={values[f.name]} error={errors[f.name]} onChange={change} />
          ))}
          <button type="submit" disabled={status.state === 'saving'}>
            {status.state === 'saving' ? 'Registering...' : 'Register'}
          </button>
          {savedAt && dirty && <span className="muted"> &nbsp;Draft autosaved {formatIST(savedAt)}</span>}
        </form>
      </div>
    </div>
  );
}
