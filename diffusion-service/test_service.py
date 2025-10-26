#!/usr/bin/env python3
"""
Test script for the Diffusion Service
Tests health endpoint and image generation
"""

import requests
import base64
import json
from pathlib import Path

SERVICE_URL = "http://localhost:7861"

def test_health():
    """Test the health endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{SERVICE_URL}/health", timeout=5)
        response.raise_for_status()
        data = response.json()

        print(f"✅ Health check passed")
        print(f"   Status: {data['status']}")
        print(f"   Device: {data['device']}")
        print(f"   Model type: {data['model_type']}")
        print(f"   Pipeline loaded: {data['pipeline_loaded']}")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_generation():
    """Test image generation"""
    print("\n🎨 Testing image generation...")
    print("   This will take 15-60 seconds depending on hardware...")

    request_data = {
        "prompt": "Photorealistic overhead shot of a plated pasta carbonara, Italian style, natural daylight, rustic wooden table, appetizing, sharp focus, professional food photography",
        "negative_prompt": "hands, text, watermark, logo, frame, blurry",
        "width": 512,  # Smaller for faster testing
        "height": 512,
        "steps": 20,   # Fewer steps for faster testing
        "cfg": 7.5,
        "seed": 42     # Fixed seed for reproducibility
    }

    try:
        response = requests.post(
            f"{SERVICE_URL}/generate",
            json=request_data,
            timeout=120  # 2 minute timeout
        )
        response.raise_for_status()
        data = response.json()

        print(f"✅ Generation successful")
        print(f"   Seed: {data['seed']}")
        print(f"   Model: {data['model']}")

        # Save the image
        output_path = Path("test_output.png")
        image_data = base64.b64decode(data['image'])
        output_path.write_bytes(image_data)

        print(f"   Image saved to: {output_path.absolute()}")
        print(f"   Image size: {len(image_data):,} bytes")

        return True
    except requests.exceptions.Timeout:
        print(f"❌ Generation timeout (may be normal on CPU)")
        return False
    except Exception as e:
        print(f"❌ Generation failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Savr Diffusion Service - Test Suite")
    print("=" * 60)

    # Test health first
    if not test_health():
        print("\n⚠️  Service not ready. Is it running?")
        print(f"   Try: docker-compose up -d")
        return False

    # Test generation
    if not test_generation():
        print("\n⚠️  Generation test failed")
        return False

    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    import sys
    sys.exit(0 if main() else 1)
