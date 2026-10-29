import { NavLink, Navigate, Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import { getSession } from '../utils/session';

const tabs = [['add', 'Add record'], ['timeline', 'Timeline'], ['medicines', 'Medicines'], ['uploads', 'My uploads'], ['privacy', 'Privacy']];

export default function PatientShell() {
  const s = getSession();
  if (!s || s.role !== 'patient') return <Navigate to="/" replace />;
  return (
    <>
      <TopBar />
      <nav className="pills">
        {tabs.map(([p, l]) => (
          <NavLink key={p} to={`/patient/${p}`} className={({ isActive }) => `pill${isActive ? ' on' : ''}`}>{l}</NavLink>
        ))}
      </nav>
      <div className="container"><Outlet /></div>
    </>
  );
}
