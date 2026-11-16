import os, joblib
from flask import Flask, jsonify, request
from questions import QUESTIONS, FEATURES
from store import Store

app = Flask(__name__)
bundle = joblib.load(os.path.join(os.path.dirname(__file__), "model.joblib"))
model, ACC = bundle["model"], bundle["accuracy"]
store = Store()

@app.get("/health")
def health():
    try:
        store.ping(); return jsonify(service="ayush-ml", ok=True, db=store.kind, env=os.environ.get("APP_ENV", "dev"))
    except Exception as e:  # noqa
        return jsonify(service="ayush-ml", ok=False, error=str(e)), 503

@app.get("/questions")
def questions():
    return jsonify([{"key": k, "label": l, "options": o} for k, l, o in QUESTIONS])

@app.post("/predict")
def predict():
    ans = (request.get_json(silent=True) or {}).get("answers") or {}
    try:
        row = [int(ans[f]) for f in FEATURES]
        if any(v not in (0, 1, 2) for v in row): raise ValueError
    except (KeyError, ValueError, TypeError):
        return jsonify(message="Answer all %d questions with 0, 1 or 2." % len(FEATURES)), 400
    probs = model.predict_proba([row])[0]
    ranked = sorted(zip(model.classes_, probs), key=lambda t: -t[1])
    label, conf = str(ranked[0][0]), float(ranked[0][1])
    store.add(label, round(conf, 3), ans)
    return jsonify(prakriti=label, confidence=round(conf, 3), top3=[{"label": str(l), "p": round(float(p), 3)} for l, p in ranked[:3]],
                   model={"type": "RandomForest", "trainedOn": "synthetic data", "testAccuracy": ACC})

@app.get("/history")
def history():
    return jsonify(store.recent(min(int(request.args.get("limit", 20)), 100)))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
