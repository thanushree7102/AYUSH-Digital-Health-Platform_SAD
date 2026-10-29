import { useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../utils/session';

export default function TopBar() {
  const nav = useNavigate();
  const s = getSession();
  return (
    <header className="topbar">
      <div className="brand">🌿 AYUSH Health Record</div>
      {s && (
        <div className="who">
          <span>{s.name}{s.healthId ? ` · ${s.healthId}` : ''}</span>
          <button type="button" className="ghost" onClick={() => { clearSession(); nav('/'); }}>Sign out</button>
        </div>
      )}
    </header>
  );
}
