# FeedbackPro — Deployment & Operations Guide

## 1. Quickstart with Docker Compose

The simplest way to run FeedbackPro in production or staging is using Docker Compose:

```bash
# 1. Clone repository and enter root directory
git clone https://github.com/organization/feedbackpro.git
cd feedbackpro

# 2. Copy environment template
cp .env.example .env

# 3. Configure secrets in .env (JWT_SECRET_KEY, POSTGRES_PASSWORD, etc.)

# 4. Start all services in detached mode
docker-compose up -d --build

# 5. Run database migrations
docker-compose exec backend alembic upgrade head

# 6. Seed demo project (optional)
docker-compose exec backend python scripts/seed_demo.py
```

---

## 2. Production Environment Variables Reference

| Variable | Description | Default | Production Recommendation |
|---|---|---|---|
| `ENVIRONMENT` | Runtime environment mode | `development` | `production` |
| `SECRET_KEY` | Application encryption secret | *(change me)* | 64-char random hex |
| `JWT_SECRET_KEY` | JWT signing secret | *(change me)* | 64-char random hex |
| `DATABASE_URL` | Async PostgreSQL connection string | `sqlite+aiosqlite:///feedbackpro.db` | `postgresql+asyncpg://user:pass@host:5432/feedbackpro` |
| `AI_PROVIDER` | AI backend provider | `deterministic` | `openai` or `gemini` |
| `OPENAI_API_KEY` | OpenAI API key | `""` | `sk-proj-...` |
| `GEMINI_API_KEY` | Google Gemini API key | `""` | `AIzaSy...` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173,http://localhost:3000` | `https://feedbackpro.yourdomain.com` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan | `30` | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan | `7` | `7` |

---

## 3. Database Migration Operations

FeedbackPro manages schema versioning with Alembic:

```bash
# Check current database revision
alembic current

# Run all pending migrations
alembic upgrade head

# Revert last migration (emergency rollback)
alembic downgrade -1

# Generate a new migration revision
alembic revision --autogenerate -m "add_new_audit_metric"
```

---

## 4. Container Health Checks & Orchestration

The backend exposes lightweight health and readiness check endpoints at `/health` and `/health/ready`:
* `/health` (Liveness): Fast process check indicating service health
* `/health/ready` (Readiness): Verifies PostgreSQL database connection and migrations

In Kubernetes, Render, or Docker Swarm, configure your liveness and readiness probes:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 15
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 10
```

---

## 5. Reverse Proxy & SSL Configuration (Nginx Example)

```nginx
server {
    listen 443 ssl http2;
    server_name feedbackpro.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/feedbackpro.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/feedbackpro.yourdomain.com/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend Single Page App
    location / {
        root /var/www/feedbackpro/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
