FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# Copy Poetry dependency manifests
COPY server/pyproject.toml server/poetry.lock* /app/

# Configure Poetry to install into system Python environment inside container
RUN poetry config virtualenvs.create false \
    && poetry install --no-root --no-interaction --no-ansi

# Copy backend source code
COPY server/ /app/server/
COPY .env* /app/

EXPOSE 5051

WORKDIR /app/server

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5051"]
