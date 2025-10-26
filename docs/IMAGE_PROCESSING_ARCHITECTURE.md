# Image Processing Architecture

## The Problem: Sharp vs Edge Functions

Supabase Edge Functions run on **Deno**, which doesn't support Node.js native modules like `sharp`. This creates a challenge for image processing.

## Solution: Two-Tier Architecture

### Tier 1: Edge Functions (Deno) - Core Pipeline
**Location:** `supabase/functions/shared/`

**Capabilities:**
- Stock image search and download
- AI generation requests
- SHA-256 hashing
- Supabase Storage uploads
- Database operations
- Image deduplication

**Limitations:**
- Cannot run `sharp` for image processing
- Images are stored as-is from sources

### Tier 2: Node.js Processing Service (Optional)
**Location:** `lib/imageProcessing.ts`

**Capabilities:**
- Center square cropping
- Resizing to 1024x1024
- Tone normalization
- Contrast/brightness adjustments
- Saturation enhancement
- Sharpening
- WebP conversion
- Thumbnail generation

## Implementation Options

### Option A: Accept Images As-Is (Simplest) ✅
```typescript
// Edge Function
export async function postProcess(buffer: Uint8Array): Promise<Uint8Array> {
  // Pass-through - stock images are already good quality
  return buffer;
}
```

**Pros:**
- Simplest implementation
- Stock images are already high quality (1024px+)
- AI-generated images are already 1024x1024
- No additional infrastructure needed

**Cons:**
- No consistent aspect ratios
- No tone normalization
- Mixed quality from different sources

### Option B: Separate Processing Service (Recommended for Production) ✅

```mermaid
graph LR
    A[Edge Function] -->|Download Image| B[Store Raw]
    B -->|Queue Job| C[Processing Service]
    C -->|Process with Sharp| D[Update Storage]
    D -->|Update DB| E[Serve Processed]
```

**Implementation:**
1. Edge function downloads and stores raw image
2. Triggers async processing job (webhook, queue, or cron)
3. Node.js service processes with sharp
4. Updates image record when done

**Pros:**
- Consistent image quality
- Professional food photography appearance
- Full control over output

**Cons:**
- More complex architecture
- Requires separate Node.js runtime
- Slight delay before processed version is available

### Option C: Client-Side Processing
Use browser-based image processing (Canvas API, Wasm libraries)

**Not recommended** - too much bandwidth and client CPU usage

## Recommended Approach

### For MVP: Option A
- Use stock images as-is (they're already optimized)
- AI-generated images are created at target size
- Focus on getting the pipeline working

### For Production: Option B
Set up async processing:

```typescript
// 1. Edge Function stores raw image
const rawUrl = await storeToSupabase(buffer, `${recipeId}/raw-${hash}.png`);

// 2. Trigger processing webhook
await fetch('https://your-processing-service.com/process', {
  method: 'POST',
  body: JSON.stringify({
    imageId,
    rawUrl,
    recipeId,
  }),
});

// 3. Processing service (Node.js)
import { postProcess } from './imageProcessing';

async function processImage(rawUrl: string, imageId: string) {
  const buffer = await downloadImage(rawUrl);
  const processed = await postProcess(buffer);
  const hash = sha256(processed);

  // Upload processed version
  const processedUrl = await uploadToSupabase(processed, `${recipeId}/${hash}.png`);

  // Update database
  await updateImageUrl(imageId, processedUrl);
}
```

## Current Implementation

**Status:** Option A (pass-through)

**Files:**
- `supabase/functions/shared/imageUtils.ts` - Deno version (no sharp)
- `lib/imageProcessing.ts` - Node.js version (with sharp) for future use

**Migration Path:**
When ready to add processing:
1. Deploy Node.js processing service
2. Update `postProcess()` in Edge Function to trigger webhook
3. Processing service uses `lib/imageProcessing.ts`
4. Gradually reprocess existing images

## Testing

```bash
# Test Deno version (Edge Functions)
deno run --allow-net --allow-env supabase/functions/shared/imageUtils.ts

# Test Node.js version (requires sharp)
npm install sharp
node -e "import('./lib/imageProcessing.ts').then(m => console.log(m))"
```

## Performance Considerations

### Stock Images
- Already optimized by Pexels/Unsplash/Pixabay
- Professional photography quality
- Appropriate sizes (1024px+)
- **Recommendation:** Use as-is

### AI-Generated Images
- Created at exact target dimensions (1024x1024)
- Consistent quality from model
- **Recommendation:** Use as-is, optionally add light sharpening

### Processing Overhead
- Sharp processing: ~100-500ms per image (Node.js)
- Edge function limitation: Cannot use sharp
- **Solution:** Async processing if needed

## Future Enhancements

1. **Lazy Processing:** Process on first view, cache result
2. **Multiple Sizes:** Generate 256px, 512px, 1024px variants
3. **WebP Support:** Convert to WebP for better compression
4. **Smart Cropping:** ML-based focal point detection
5. **CDN Integration:** CloudFront/Cloudflare for global delivery

## Conclusion

For the initial release, **Option A (pass-through)** is sufficient:
- Stock images are already high quality
- AI images are generated at target size
- Keeps architecture simple
- Can add processing later without breaking changes

The `lib/imageProcessing.ts` file is ready for future use when you want to add professional-grade image processing.
