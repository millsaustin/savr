# Savr Diffusion Service

Self-hosted Stable Diffusion image generation microservice for recipe images. 100% free and open-source, runs on CPU or GPU.

## Features

- 🎨 **SDXL or SD 1.5** - Choose between quality (SDXL) or speed (SD 1.5)
- 🚀 **Auto-detect GPU** - Automatically uses CUDA if available, falls back to CPU
- 💾 **Memory efficient** - Attention slicing and VAE slicing for lower VRAM usage
- 🔒 **Safety filter** - Built-in content safety checking
- 🐳 **Docker ready** - Easy deployment with Docker Compose
- ⚡ **Fast inference** - DPM++ solver for high-quality results in fewer steps

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Build and start the service
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop the service
docker-compose down
```

The service will be available at `http://localhost:7861`

### Option 2: Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py
```

## Configuration

### Environment Variables

Set these in `docker-compose.yml` or export them:

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_SDXL` | `false` | Use SDXL (true) or SD 1.5 (false) |
| `SDXL_MODEL` | `stabilityai/stable-diffusion-xl-base-1.0` | SDXL model ID |
| `SD15_MODEL` | `runwayml/stable-diffusion-v1-5` | SD 1.5 model ID |
| `ENABLE_ATTENTION_SLICING` | `true` | Enable memory-efficient attention |
| `ENABLE_VAE_SLICING` | `true` | Enable VAE slicing for lower VRAM |

### Model Selection

**SD 1.5 (Default):**
- ✅ Faster generation (15-30 seconds)
- ✅ Works on CPU (slow but functional)
- ✅ Lower VRAM requirement (4-6GB)
- ❌ Lower quality than SDXL

**SDXL:**
- ✅ Higher quality, more detailed images
- ✅ Better understanding of complex prompts
- ❌ Slower generation (30-60 seconds on GPU)
- ❌ Requires 10-12GB VRAM
- ❌ CPU generation is extremely slow

**Recommendation:** Use SD 1.5 unless you have a GPU with 12GB+ VRAM.

## API Usage

### POST /generate

Generate an image from a text prompt.

**Request:**

```bash
curl -X POST http://localhost:7861/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Photorealistic overhead shot of a plated Garlic Chicken, Mediterranean style, natural daylight, rustic wooden table",
    "negative_prompt": "hands, text, watermark, logo, blurry",
    "width": 1024,
    "height": 1024,
    "steps": 28,
    "cfg": 7.5,
    "seed": null
  }'
```

**Response:**

```json
{
  "image": "<base64-encoded-png>",
  "seed": 42,
  "model": "runwayml/stable-diffusion-v1-5"
}
```

**Parameters:**

- `prompt` (required): Text description of the image to generate
- `negative_prompt` (optional): What to avoid in the image
- `width` (512-1024): Image width in pixels
- `height` (512-1024): Image height in pixels
- `steps` (10-50): Number of inference steps (higher = better quality, slower)
- `cfg` (1-20): Classifier-free guidance scale (7-8 is typical)
- `seed` (optional): Random seed for reproducibility

### GET /health

Check service health and status.

```bash
curl http://localhost:7861/health
```

**Response:**

```json
{
  "status": "healthy",
  "pipeline_loaded": true,
  "device": "cuda",
  "cuda_available": true,
  "model_type": "SD1.5"
}
```

## Hardware Requirements

### Minimum (CPU only)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB for models
- **Generation time**: 5-10 minutes per image

### Recommended (GPU)
- **GPU**: NVIDIA GPU with 6GB+ VRAM
- **RAM**: 16GB
- **Storage**: 10GB for models
- **Generation time**: 15-30 seconds per image

### Optimal (GPU)
- **GPU**: NVIDIA GPU with 12GB+ VRAM (for SDXL)
- **RAM**: 32GB
- **Storage**: 20GB for models
- **Generation time**: 10-20 seconds per image

## Performance Tips

1. **Use SD 1.5 instead of SDXL** for faster generation
2. **Reduce steps to 20-25** for quicker results (minimal quality loss)
3. **Generate 1024x1024 or 768x768** - avoid larger sizes
4. **Enable attention slicing** to reduce VRAM usage
5. **Use Docker** for easier model caching and deployment

## First Run

On first startup, the service will download the model (~7GB for SDXL, ~4GB for SD 1.5). This only happens once - models are cached in a persistent volume.

**Download time:** 5-30 minutes depending on internet speed

**Location:** Models are cached in `/app/models` (Docker) or `~/.cache/huggingface` (local)

## Troubleshooting

### Out of Memory (CUDA)

```bash
# Enable memory optimizations
USE_SDXL=false  # Switch to SD 1.5
ENABLE_ATTENTION_SLICING=true
ENABLE_VAE_SLICING=true
```

### Slow CPU Generation

CPU generation is 50-100x slower than GPU. Consider:
- Using a cloud GPU instance (RunPod, Vast.ai)
- Reducing image size to 512x512
- Using fewer steps (15-20)

### Model Download Fails

```bash
# Check disk space
df -h

# Clear cache and retry
docker-compose down -v
docker-compose up -d
```

## Integration Example

```typescript
// TypeScript example for calling from Edge Function
async function generateImage(prompt: string) {
  const response = await fetch('http://local-diffusion:7861/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      negative_prompt: 'hands, text, watermark, logo, blurry',
      width: 1024,
      height: 1024,
      steps: 28,
      cfg: 7.5,
    }),
  });

  const data = await response.json();

  // Decode base64 to buffer
  const imageBuffer = Buffer.from(data.image, 'base64');

  return imageBuffer;
}
```

## Production Deployment

For production use:

1. **Use a dedicated GPU server** (not CPU)
2. **Set up rate limiting** to prevent abuse
3. **Add authentication** to the API
4. **Monitor GPU memory** and restart on OOM
5. **Use a reverse proxy** (nginx) with caching
6. **Consider a queue system** (Redis + Bull) for handling multiple requests

## License

This service uses:
- FastAPI (MIT)
- Diffusers (Apache 2.0)
- Stable Diffusion models (CreativeML Open RAIL-M / SDXL License)

See individual model licenses for commercial use terms.

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Verify GPU: `nvidia-smi` (if using GPU)
- Test health: `curl http://localhost:7861/health`
