# AYUSH Unified on Docker (COMP405 final project)

## Architecture
```
Browser ──► frontend (nginx :80) ──/v1──► api (Express :4000) ──► ml (Flask :5000) ──► db (MySQL :3306)
                                              │                                          │
                                         volume ayush-data (SQLite)                 volume mysql-data
```
| Container | Image | Role | Storage |
|---|---|---|---|
| frontend | nginx + React build (`frontend/Dockerfile`) | serves UI, reverse-proxies `/v1` to `api` | – |
| api | node:22-slim (`backend/Dockerfile`, build context = repo root) | auth, face + OTP, records, WhatsApp bot | volume `ayush-data` (SQLite, uploads) |
| ml | python:3.12-slim (`ml-service/Dockerfile`) | Prakriti prediction model (RandomForest, trained at image build) | – |
| db | mysql:8.4 | stores every ML prediction (permanent storage service) | volume `mysql-data` |
| translate (optional) | libretranslate | own translation server (`--profile translate`) | – |

## Run (dev / staging / prod)
```bash
docker compose --env-file env/dev.env     -p ayush-dev     up -d --build   # http://localhost:8080
docker compose --env-file env/staging.env -p ayush-staging up -d --build   # http://localhost:8081
cp env/prod.env.example env/prod.env   # then set real secrets
docker compose --env-file env/prod.env -p ayush-prod -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
Open **/prakriti-ai** (top bar: "🤖 Prakriti AI") to use the ML service. `docker compose -p ayush-dev logs -f api` shows OTPs.
Stop: `docker compose -p ayush-dev down` (data kept) / `down -v` (data deleted).

## Docker Hub (Lab 8)
```bash
DOCKERHUB_USER=yourname TAG=v1 ./scripts/dockerhub-push.sh
DOCKERHUB_USER=yourname TAG=v1 docker compose --env-file env/dev.env up -d    # pulls/uses those images
```

## Kubernetes (Lab 12) – Docker Desktop → Settings → Kubernetes → Enable
```bash
cp env/dev.env.example env/dev.env      # edit locally; env/dev.env is ignored by Git
docker compose --env-file env/dev.env build
kubectl apply -f k8s/00-namespace-config.yaml
cp env/k8s-secret.env.example env/k8s-secret.env
# Edit env/k8s-secret.env locally and set strong, unique values before applying.
kubectl create secret generic ayush-secret -n ayush --from-env-file=env/k8s-secret.env --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/
kubectl -n ayush get pods,svc,pvc
# open http://localhost:30080
kubectl -n ayush scale deployment ml --replicas=3     # scaling demo
kubectl delete namespace ayush                        # clean up
```
(`kubectl` uses the images from the local Docker engine; replace `local/` with your Docker Hub name in `k8s/*.yaml` to pull from Hub.)
Do not commit `env/k8s-secret.env` or put production credentials in Kubernetes manifests.

## Concepts → where to point in the viva
| Concept | Where |
|---|---|
| Microservices + service discovery by name | `docker-compose.yml` (`ML_URL: http://ml:5000`, nginx `proxy_pass http://api:4000`) |
| Multi-stage builds, layer caching, non-root user | `backend/Dockerfile`, `frontend/Dockerfile` |
| Model baked into the image | `ml-service/Dockerfile` (`RUN python train.py`) |
| Config separated from code (dev/staging/prod) | `env/*.env`, `docker-compose.prod.yml`, k8s ConfigMap + Secret |
| Persistent storage | named volumes `ayush-data`, `mysql-data`; k8s PVCs |
| Health checks + startup ordering | `HEALTHCHECK`, `depends_on: condition: service_healthy` |
| User-defined network | `ayush-net` |
| Orchestration | `k8s/` (Deployments, Services, PVC, probes, replicas) |
| Registry | `scripts/dockerhub-push.sh` |

## Honest limits
- The main patient database (30 tables) is still SQLite on a volume, so `api` runs as one replica; MySQL holds the ML prediction history. Moving the whole schema to MySQL is the next step.
- The ML model is trained on synthetic data (test accuracy ≈ 0.73): it demonstrates train → package → deploy, not clinical accuracy.
- Demo features (OTP on screen, demo Aadhaar) are off in `prod.env.example` (`OTP_SHOW=0`, `SEED_DEMO=0`).
