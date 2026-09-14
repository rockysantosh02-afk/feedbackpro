.PHONY: help install dev dev-backend dev-worker dev-frontend test test-security lint check seed

help:
	@echo "FeedbackPro Automation Makefile"
	@echo "  make install        Install backend and frontend dependencies"
	@echo "  make dev            Run all services locally"
	@echo "  make dev-backend    Run FastAPI development server"
	@echo "  make dev-worker     Run Background Audit Worker"
	@echo "  make dev-frontend   Run React Vite development server"
	@echo "  make test           Run all backend tests"
	@echo "  make test-security  Run security validation test suite"
	@echo "  make check          Run security_check.py standalone verification"
	@echo "  make seed           Seed sample hackathon project and audit findings"

install:
	cd backend && pip install -e ".[dev]"
	cd frontend && npm install

dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-worker:
	cd backend && python -m app.workers.audit_worker

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && pytest -v tests

test-security:
	cd backend && pytest -v tests/security

check:
	python scripts/security_check.py

seed:
	python scripts/seed_demo.py
