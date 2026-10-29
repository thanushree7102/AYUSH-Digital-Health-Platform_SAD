import RoleRegister from '../../components/RoleRegister';
import { COUNCILS, SYSTEMS } from '../../constants/options';

const fields = [
  { name: 'name', label: 'Full name (as on certificate)', required: true },
  { name: 'system', label: 'System of medicine', type: 'select', options: SYSTEMS, required: true },
  { name: 'qualification', label: 'Qualification (e.g. BAMS, MD Ayurveda)', required: true },
  { name: 'council', label: 'Registering council', type: 'select', options: COUNCILS, required: true },
  { name: 'registrationNo', label: 'Council registration number', required: true },
  { name: 'experience', label: 'Years of experience', digits: 2, pattern: /^\d{0,2}$/, patternMsg: 'Numbers only' },
  { name: 'mobile', label: 'Mobile number', digits: 10, required: true, pattern: /^[6-9]\d{9}$/, patternMsg: 'Enter a valid 10-digit mobile number' },
  { name: 'email', label: 'Email', type: 'email', required: true, pattern: /^\S+@\S+\.\S+$/, patternMsg: 'Enter a valid email' },
  { name: 'facilityId', label: 'Clinic / Hospital ID (optional, e.g. HF-0001-0001)' },
];

export default function Doctor() {
  return (
    <RoleRegister
      title="Doctor / practitioner registration"
      intro="We verify your council registration before you can open any patient record."
      endpoint="/auth/register/practitioner"
      fields={fields}
      steps={{ certificate: { label: 'Registration certificate (PDF/JPG/PNG)', error: 'Upload your registration certificate' }, declaration: 'I confirm my details are true and I will access records only with patient consent.', submit: 'Submit for verification' }}
    />
  );
}
