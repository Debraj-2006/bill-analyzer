FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for PDF processing (PyMuPDF needs these)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Cloud Run uses PORT env var (default 8080)
ENV PORT=8080

# Start uvicorn
CMD exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
