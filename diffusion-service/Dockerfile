# Dockerfile for Stable Diffusion image generation service
# Supports both GPU (CUDA) and CPU execution

# Use NVIDIA CUDA base image for GPU support (fallback to CPU if no GPU)
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04 AS base

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    python3-dev \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.10 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1 && \
    update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# Set working directory
WORKDIR /app

# Install PyTorch with CUDA support (will gracefully fall back to CPU if no GPU)
RUN pip install --no-cache-dir \
    torch==2.1.0 \
    torchvision==0.16.0 \
    --index-url https://download.pytorch.org/whl/cu121

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Create cache directory for models
RUN mkdir -p /app/models && \
    chmod 777 /app/models

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV TRANSFORMERS_CACHE=/app/models
ENV HF_HOME=/app/models

# Expose port
EXPOSE 7861

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:7861/health')"

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7861", "--workers", "1"]
