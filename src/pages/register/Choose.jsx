import { Link } from 'react-router-dom';
import TopBar from '../../components/TopBar';

const roles = [
  ['/register/patient', '🧑 Patient', 'Create your health record with Aadhaar. Add prescriptions and choose which doctors can see them.'],
  ['/register/doctor', '🩺 Doctor / Practitioner', 'Register with your council number and certificate. An admin verifies you before you can open records.'],
  ['/register/clinic', '🏥 Clinic / Hospital', 'Register your facility and licence. Doctors link to your Facility ID.'],
  ['/register/admin', '🛡️ Admin / Auditor', 'Staff only. Needs an invite code. Admins approve registrations; auditors view the log.'],
];

export default function Choose() {
  return (
    <>
      <TopBar />
      <div className="container">
        <div className="card"><h2>Create an account</h2><p className="muted">Each account type has its own form. Pick yours.</p></div>
        <div className="rolegrid">
          {roles.map(([to, t, d]) => (
            <Link key={to} to={to} className="rolecard"><h3>{t}</h3><p className="muted">{d}</p></Link>
          ))}
        </div>
      </div>
    </>
  );
}
