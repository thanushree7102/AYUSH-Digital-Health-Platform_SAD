import RoleRegister from '../../components/RoleRegister';
import { FACILITY_TYPES, STATES, SYSTEMS } from '../../constants/options';

const fields = [
  { name: 'name', label: 'Facility name', required: true },
  { name: 'facilityType', label: 'Facility type', type: 'select', options: FACILITY_TYPES, required: true },
  { name: 'systems', label: 'Systems of medicine offered', type: 'multiselect', options: SYSTEMS, required: true },
  { name: 'licenceNo', label: 'Licence / registration number', required: true },
  { name: 'address', label: 'Address', type: 'textarea', required: true },
  { name: 'state', label: 'State', type: 'select', options: STATES, required: true },
  { name: 'pincode', label: 'Pincode', digits: 6, required: true, pattern: /^\d{6}$/, patternMsg: 'Pincode must be 6 digits' },
  { name: 'contactPerson', label: 'Contact person', required: true },
  { name: 'mobile', label: 'Contact mobile number', digits: 10, required: true, pattern: /^[6-9]\d{9}$/, patternMsg: 'Enter a valid 10-digit mobile number' },
  { name: 'email', label: 'Facility email', type: 'email' },
];

export default function Clinic() {
  return (
    <RoleRegister
      title="Clinic / hospital registration"
      intro="Register your facility. You get a Facility ID to share with your doctors."
      endpoint="/auth/register/facility"
      fields={fields}
      steps={{ certificate: { label: 'Licence document (PDF/JPG/PNG)', error: 'Upload the licence document' }, declaration: 'I am authorised to register this facility and the details are true.', submit: 'Submit for verification' }}
    />
  );
}
