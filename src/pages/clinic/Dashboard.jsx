import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { platform } from '../../api/client';
import TopBar from '../../components/TopBar';
import { getSession } from '../../utils/session';

export default function ClinicDashboard() {
  const s = getSession();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (s?.facilityId) platform.get(`/facilities/${s.facilityId}/practitioners`).then((r) => setRows(r.data)).catch(() => setErr('Could not load doctors. Retry in a moment.'));
  }, []); // eslint-disable-line
  if (!s || s.role !== 'facility') return <Navigate to="/" replace />;
  return (
    <><TopBar /><div className="container"><div className="card">
      <h2>{s.name}</h2>
      <p className="muted">Facility ID: <strong>{s.facilityId}</strong>. Share it with your doctors when they register. This page shows staff only, never patient records.</p>
      {err && <div className="banner err">{err}</div>}
      <table className="tbl"><thead><tr><th>Doctor</th><th>System</th><th>Status</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.system}</td><td><span className="badge">{r.status}</span></td></tr>)}
          {!rows.length && <tr><td colSpan={3} className="muted">No doctors linked yet.</td></tr>}</tbody></table>
    </div></div></>
  );
}
