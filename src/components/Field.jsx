export default function Field({ field, value, error, onChange, disabled }) {
  const { name, label, type = 'text', options = [], required } = field;
  const id = `f-${name}`;
  let input;

  if (type === 'select') {
    input = (
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(name, e.target.value)}>
        <option value="">-- Select --</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (type === 'multiselect') {
    input = (
      <div className="checks">
        {options.map((o) => (
          <label key={o}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.includes(o)}
              onChange={(e) =>
                onChange(name, e.target.checked ? [...value, o] : value.filter((v) => v !== o))
              }
            />{' '}{o}
          </label>
        ))}
      </div>
    );
  } else if (type === 'textarea') {
    input = <textarea id={id} rows={3} value={value} disabled={disabled} onChange={(e) => onChange(name, e.target.value)} />;
  } else {
    input = <input id={id} type={type} value={value} disabled={disabled} onChange={(e) => onChange(name, e.target.value)} />;
  }

  return (
    <div className={`field ${error ? 'invalid' : ''}`}>
      <label htmlFor={id}>{label}{required && ' *'}</label>
      {input}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
