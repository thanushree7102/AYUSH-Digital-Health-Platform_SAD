"""Train the Prakriti classifier on SYNTHETIC data (generated from the textbook trait table).
This is a teaching demo of 'training + packaging an ML model in a container', not a medical device."""
import random, joblib, numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from questions import FEATURES, LABELS

random.seed(7); np.random.seed(7)
# which dosha indices dominate each label
PROFILE = {"Vata": [0], "Pitta": [1], "Kapha": [2], "Vata-Pitta": [0, 1], "Pitta-Kapha": [1, 2],
           "Vata-Kapha": [0, 2], "Sama (Tridosha)": [0, 1, 2]}

def sample(label):
    dom = PROFILE[label]
    row = []
    for _ in FEATURES:
        # 75% of answers follow the profile, 25% noise -> realistic overlap between classes
        row.append(random.choice(dom) if random.random() < 0.75 else random.randint(0, 2))
    return row

X, y = [], []
for lab in LABELS:
    for _ in range(600):
        X.append(sample(lab)); y.append(lab)
X = np.array(X); y = np.array(y)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=1, stratify=y)
model = RandomForestClassifier(n_estimators=200, random_state=1).fit(Xtr, ytr)
acc = accuracy_score(yte, model.predict(Xte))
print(f"test accuracy: {acc:.3f} on {len(yte)} samples")
joblib.dump({"model": model, "accuracy": round(float(acc), 3)}, "model.joblib")
