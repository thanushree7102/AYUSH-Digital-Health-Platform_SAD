# syntax=docker/dockerfile:1
# API container (Express backend + SQLite database module). Build from the repo root:
#   docker build -f backend/Dockerfile -t ayush-api .
# The frontend and ML model are separate containers.
# ---------- Stage 1: install production-only dependencies ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./backend/
COPY database/package.json database/package-lock.json ./database/
RUN cd backend && npm ci --omit=dev && cd ../database && npm ci --omit=dev

# ---------- Stage 2: small runtime image ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    DB_FILE=/app/data/ayush.db \
    STORAGE_DIR=/app/data/storage
WORKDIR /app/backend

# Backend code + database module, each with its production node_modules (no dev tools, no UI)
COPY --from=deps /app/backend/node_modules ./node_modules
COPY --from=deps /app/database/node_modules /app/database/node_modules
COPY backend/package.json backend/server.js backend/face.js backend/otp.js backend/aadhaar.js backend/security.js ./
COPY backend/whatsapp ./whatsapp
COPY backend/tessdata ./tessdata
COPY database/package.json database/db.js database/migrate-legacy.js /app/database/

# Persistent data (SQLite DB, uploads, WhatsApp login) lives in /app/data -> mounted as a volume.
# backend/data is a link to it, because the WhatsApp login is kept in <working dir>/data/wa_auth.
RUN mkdir -p /app/data && ln -s /app/data /app/backend/data && chown -R node:node /app
USER node
VOLUME ["/app/data"]
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
