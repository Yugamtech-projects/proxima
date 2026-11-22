.PHONY: help install setup run lock clean lint migrate

help:
	@echo "PROXIMA Server Automation"
	@echo "========================="
	@echo "Available commands:"
	@echo "  make setup     - Configure Poetry for Python 3.13, lock & install dependencies (--no-root)"
	@echo "  make install   - Install Poetry package manager"
	@echo "  make run       - Run backend server using nodemon auto-reloader"
	@echo "  make migrate   - Migrate JSON records from data/proxima_db.json into PostgreSQL"
	@echo "  make lock      - Generate / refresh poetry.lock"
	@echo "  make clean     - Remove Python __pycache__ and cache directories"
	@echo "  make lint      - Run Ruff linter across Python codebase"

install:
	@echo "📦 Installing Poetry..."
	curl -sSL https://install.python-poetry.org | python3 -

setup:
	@echo "🔧 Configuring Poetry environment for Python 3.13..."
	poetry env use python3.13
	@echo "🔒 Locking dependencies..."
	poetry lock
	@echo "📥 Installing dependencies (--no-root)..."
	poetry install --no-root

run:
	@chmod +x ../run_app.sh
	../run_app.sh

migrate:
	@echo "🚀 Running database migration..."
	poetry run python migrate.py

lock:
	@echo "🔒 Updating poetry.lock..."
	poetry lock

clean:
	@echo "🧹 Cleaning Python cache files..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	rm -rf .ruff_cache .pytest_cache 2>/dev/null || true
	@echo "✅ Cache cleaned."

lint:
	@echo "🔍 Running Ruff linter..."
	poetry run ruff check .
