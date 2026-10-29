import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { platform } from '../../api/client';
import TopBar from '../../components/TopBar';
import { getSession } from '../../utils/session';
import { formatIST as toIST } from '../../utils/time';

export default function AdminDashboard() {
  const s = getSession();
  const [pending, setPending] = useState([]);
  const [audit, setAudit] = useState([]);
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    try {
      const [p, a] = await Promise.all([platform.get('/admin/pending'), platform.get('/admin/audit')]);
      setPending(p.data); setAudit(a.data);
    } catch (e) { setMsg('Could not load. Retry in a moment.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (!s || s.role !== 'admin') return <Navigate to="/" replace />;
  const canDecide = s.adminType === 'Administrator';

  const decide = async (row, decision) => {
    try { await platform.post('/admin/decisions', { kind: row.kind, id: row.id, decision }); setMsg(''); load(); }
    catch (e) { setMsg(e.response?.data?.message || 'Could not save the decision.'); }
  };

  return (
    <><TopBar /><div className="container">
      <div className="card"><h2>{s.adminType} dashboard</h2>
        {!canDecide && <div className="banner info">Auditors can view but cannot approve or reject.</div>}
        {msg && <div className="banner err">{msg}</div>}
        <h3>Pending registrations</h3>
        <table className="tbl"><thead><tr><th>Type</th><th>Name</th><th>Details</th><th></th></tr></thead>
          <tbody>{pending.map((r) => (
            <tr key={r.id}><td>{r.kind}</td><td>{r.name}<br /><span className="muted">{r.id}</span></td><td>{r.detail}</td>
              <td>{canDecide && <><button type="button" onClick={() => decide(r, 'approve')}>Approve</button>{' '}<button type="button" className="secondary" onClick={() => decide(r, 'reject')}>Reject</button></>}</td></tr>))}
            {!pending.length && <tr><td colSpan={4} className="muted">Nothing waiting.</td></tr>}</tbody></table>
      </div>
      <div className="card"><h3>Audit log</h3>
        <table className="tbl"><thead><tr><th>When (IST)</th><th>By</th><th>Decision</th><th>Target</th></tr></thead>
          <tbody>{audit.map((a, i) => <tr key={i}><td>{toIST(a.at)}</td><td>{a.by}</td><td>{a.decision}</td><td>{a.targetId}</td></tr>)}
            {!audit.length && <tr><td colSpan={4} className="muted">No decisions yet.</td></tr>}</tbody></table>
      </div>
    </div></>
  );
}
