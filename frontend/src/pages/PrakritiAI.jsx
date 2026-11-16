import { useEffect, useState } from 'react';
import { platform } from '../api/client';
import TopBar from '../components/TopBar';

// Talks to the separate ML microservice (Flask + scikit-learn) through the API: /v1/ml/*
export default function PrakritiAI() {
  const [qs, setQs] = useState([]);
  const [ans, setAns] = useState({});
  const [res, setRes] = useState(null);
  const [hist, setHist] = useState([]);
  const [err, setErr] = useState('');

  const loadHist = () => platform.get('/ml/history').then((r) => setHist(r.data)).catch(() => {});
  useEffect(() => {
    platform.get('/ml/questions').then((r) => setQs(r.data)).catch((e) => setErr(e.response?.data?.message || 'ML service not reachable.'));
    loadHist();
  }, []);

  const submit = async () => {
    setErr(''); setRes(null);
    try { const r = await platform.post('/ml/predict', { answers: ans }); setRes(r.data); loadHist(); }
    catch (e) { setErr(e.response?.data?.message || 'Prediction failed.'); }
  };
  const done = qs.length > 0 && qs.every((q) => ans[q.key] !== undefined);

  return (
    <>
      <TopBar />
      <div className="container">
        <div className="card">
          <h2>🤖 Prakriti AI (ML service)</h2>
          <p className="muted">Answer 10 questions; a machine-learning model running in its own container predicts the likely Prakriti. Demo model trained on synthetic data, not a medical diagnosis.</p>
          {qs.map((q) => (
            <div key={q.key} style={{ margin: '12px 0' }}>
              <strong>{q.label}</strong>
              <div>{q.options.map((o, i) => (
                <label key={i} style={{ display: 'block', margin: '3px 0' }}>
                  <input type="radio" name={q.key} checked={ans[q.key] === i} onChange={() => setAns({ ...ans, [q.key]: i })} /> {o}
                </label>
              ))}</div>
            </div>
          ))}
          <button type="button" disabled={!done} onClick={submit}>Predict Prakriti</button>
          {err && <p style={{ color: '#b42318' }}>{err}</p>}
        </div>
        {res && (
          <div className="card">
            <h3>Result: {res.prakriti} ({Math.round(res.confidence * 100)}%)</h3>
            <ul>{res.top3.map((t) => <li key={t.label}>{t.label}: {Math.round(t.p * 100)}%</li>)}</ul>
            <p className="muted">{res.model.type}, {res.model.trainedOn}, test accuracy {res.model.testAccuracy}</p>
          </div>
        )}
        {hist.length > 0 && (
          <div className="card">
            <h3>Recent predictions (stored in the database container)</h3>
            <ul>{hist.map((h) => <li key={h.id}>#{h.id} {h.created_at}: {h.label} ({Math.round(h.confidence * 100)}%)</li>)}</ul>
          </div>
        )}
      </div>
    </>
  );
}
