# app.py - Self-hosted Stable Diffusion image generation service
# Free, open-source AI image generation with SDXL fallback to SD 1.5

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import base64
import io
import os
import logging
from PIL import Image
import torch
from diffusers import (
    StableDiffusionXLPipeline,
    StableDiffusionPipeline,
    DPMSolverMultistepScheduler,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

#############################
# CONFIGURATION
#############################

# Model selection (can be overridden via env)
SDXL_MODEL = os.getenv("SDXL_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
SD15_MODEL = os.getenv("SD15_MODEL", "runwayml/stable-diffusion-v1-5")
USE_SDXL = os.getenv("USE_SDXL", "true").lower() == "true"

# Performance settings
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
TORCH_DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32
ENABLE_ATTENTION_SLICING = os.getenv("ENABLE_ATTENTION_SLICING", "true").lower() == "true"
ENABLE_VAE_SLICING = os.getenv("ENABLE_VAE_SLICING", "true").lower() == "true"

logger.info(f"🚀 Initializing Stable Diffusion service")
logger.info(f"   Device: {DEVICE}")
logger.info(f"   Data type: {TORCH_DTYPE}")
logger.info(f"   Using SDXL: {USE_SDXL}")

#############################
# LOAD PIPELINE
#############################

pipeline = None

def load_pipeline():
    """Load the appropriate Stable Diffusion pipeline based on configuration"""
    global pipeline

    try:
        if USE_SDXL and DEVICE == "cuda":
            logger.info(f"📦 Loading SDXL model: {SDXL_MODEL}")
            pipeline = StableDiffusionXLPipeline.from_pretrained(
                SDXL_MODEL,
                torch_dtype=TORCH_DTYPE,
                use_safetensors=True,
                variant="fp16" if DEVICE == "cuda" else None,
            )
        else:
            logger.info(f"📦 Loading SD 1.5 model: {SD15_MODEL}")
            pipeline = StableDiffusionPipeline.from_pretrained(
                SD15_MODEL,
                torch_dtype=TORCH_DTYPE,
                use_safetensors=True,
            )

        # Move to device
        pipeline = pipeline.to(DEVICE)

        # Optimize for memory efficiency
        if ENABLE_ATTENTION_SLICING:
            pipeline.enable_attention_slicing()
            logger.info("   ✓ Attention slicing enabled")

        if ENABLE_VAE_SLICING and hasattr(pipeline, 'enable_vae_slicing'):
            pipeline.enable_vae_slicing()
            logger.info("   ✓ VAE slicing enabled")

        # Use faster scheduler
        pipeline.scheduler = DPMSolverMultistepScheduler.from_config(
            pipeline.scheduler.config
        )
        logger.info("   ✓ Using DPM++ solver")

        # Enable safety checker (basic)
        if hasattr(pipeline, 'safety_checker') and pipeline.safety_checker is None:
            logger.warning("   ⚠ Safety checker not loaded - consider enabling for production")

        logger.info("✅ Pipeline loaded successfully")

    except Exception as e:
        logger.error(f"❌ Failed to load pipeline: {e}")
        raise RuntimeError(f"Could not load diffusion model: {e}")

# Load pipeline on startup
load_pipeline()

#############################
# REQUEST/RESPONSE MODELS
#############################

class GenRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for image generation")
    negative_prompt: Optional[str] = Field(
        "hands, text, watermark, logo, frame, extra limbs, distorted, grotesque, lowres, blurry",
        description="Negative prompt to avoid unwanted elements"
    )
    width: int = Field(1024, ge=512, le=1024, description="Image width (512-1024)")
    height: int = Field(1024, ge=512, le=1024, description="Image height (512-1024)")
    steps: int = Field(28, ge=10, le=50, description="Number of inference steps (10-50)")
    cfg: float = Field(7.5, ge=1.0, le=20.0, description="Classifier-free guidance scale (1-20)")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")

class GenResponse(BaseModel):
    image: str = Field(..., description="Base64-encoded PNG image")
    seed: int = Field(..., description="Seed used for generation")
    model: str = Field(..., description="Model used for generation")

#############################
# FASTAPI APP
#############################

app = FastAPI(
    title="Savr Diffusion Service",
    description="Self-hosted Stable Diffusion image generation for recipe images",
    version="1.0.0"
)

# CORS middleware (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#############################
# ENDPOINTS
#############################

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "status": "ready",
        "device": DEVICE,
        "model": SDXL_MODEL if USE_SDXL else SD15_MODEL,
        "torch_version": torch.__version__,
    }

@app.get("/health")
def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "pipeline_loaded": pipeline is not None,
        "device": DEVICE,
        "cuda_available": torch.cuda.is_available(),
        "model_type": "SDXL" if USE_SDXL else "SD1.5",
    }

@app.post("/generate", response_model=GenResponse)
def generate(req: GenRequest):
    """
    Generate an image from a text prompt using Stable Diffusion

    Returns a base64-encoded PNG image
    """
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Pipeline not loaded")

    try:
        logger.info(f"🎨 Generating image: '{req.prompt[:60]}...'")
        logger.info(f"   Size: {req.width}x{req.height}, Steps: {req.steps}, CFG: {req.cfg}")

        # Set random seed
        generator = None
        if req.seed is not None:
            generator = torch.Generator(device=DEVICE).manual_seed(req.seed)
            used_seed = req.seed
        else:
            # Generate random seed
            used_seed = torch.randint(0, 2**32 - 1, (1,)).item()
            generator = torch.Generator(device=DEVICE).manual_seed(used_seed)

        # Generate image
        with torch.inference_mode():
            result = pipeline(
                prompt=req.prompt,
                negative_prompt=req.negative_prompt,
                width=req.width,
                height=req.height,
                num_inference_steps=req.steps,
                guidance_scale=req.cfg,
                generator=generator,
            )

        # Extract image (handle safety checker output)
        if hasattr(result, 'images'):
            image = result.images[0]
        else:
            image = result[0]

        # Check if image was filtered by safety checker
        if image is None:
            logger.warning("⚠ Image filtered by safety checker")
            raise HTTPException(
                status_code=400,
                detail="Image generation failed safety check. Please modify your prompt."
            )

        # Convert to PNG and encode as base64
        buffer = io.BytesIO()
        image.save(buffer, format="PNG", optimize=True)
        buffer.seek(0)

        image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        logger.info(f"✅ Image generated successfully (seed: {used_seed})")

        return GenResponse(
            image=image_base64,
            seed=used_seed,
            model=SDXL_MODEL if USE_SDXL else SD15_MODEL,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")

#############################
# CLEANUP
#############################

@app.on_event("shutdown")
def shutdown_event():
    """Cleanup on shutdown"""
    global pipeline
    if pipeline is not None:
        logger.info("🧹 Cleaning up pipeline")
        del pipeline
        pipeline = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7861)
