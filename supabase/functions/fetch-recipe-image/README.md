# Fetch Recipe Image Edge Function

Supabase Edge Function that fetches or generates images for recipes using a stock-first + AI fallback pipeline.

## Endpoint

```
POST https://your-project.supabase.co/functions/v1/fetch-recipe-image
```

## Authentication

Three options (configure via environment variables):

### Option 1: Service Role Key (Recommended for server-to-server)
```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetch-recipe-image \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Option 2: Custom API Key
```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetch-recipe-image \
  -H "X-API-Key: YOUR_CUSTOM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Option 3: Public Access (Development only)
Set `ALLOW_PUBLIC_IMAGE_REQUESTS=true` in environment variables.

## Request Body

```json
{
  "recipeId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Harissa Chicken with Couscous",
  "tags": ["chicken", "harissa", "couscous", "mediterranean", "dinner"],
  "category": "high-protein",
  "cuisine": "Mediterranean"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recipeId` | string (UUID) | Yes | Unique recipe identifier |
| `name` | string | Yes | Recipe name for image search |
| `tags` | string[] | Yes | Tags for search refinement |
| `category` | string | No | Recipe category (for placeholder fallback) |
| `cuisine` | string | No | Cuisine type (for search queries) |

## Response

### Success (200)

```json
{
  "image_url": "https://your-project.supabase.co/storage/v1/object/public/recipes/123.../abc123.png",
  "source": "stock",
  "provider": "pexels",
  "image_id": "456e4567-e89b-12d3-a456-426614174001",
  "processing_time_ms": 1234
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `image_url` | string | Public URL to the image |
| `source` | enum | `"stock"`, `"generated"`, or `"placeholder"` |
| `provider` | string? | `"pexels"`, `"unsplash"`, or `"pixabay"` (if stock) |
| `image_id` | string (UUID) | Database ID of the image record |
| `processing_time_ms` | number | Time taken to process the request |

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation failed",
  "message": "Missing or invalid recipeId (must be UUID string)"
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

#### 405 Method Not Allowed
```json
{
  "error": "Method not allowed",
  "message": "Only POST requests are accepted"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message",
  "details": {
    "name": "Error",
    "stack": "..."
  }
}
```

## Pipeline Flow

1. **Check existing**: If recipe already has an image, return it
2. **Stock search**: Try Pexels → Unsplash → Pixabay
3. **AI generation**: If no stock images found, generate locally
4. **Placeholder**: If all fails, use category placeholder
5. **Store & link**: Save to Supabase Storage and link to recipe

## Deployment

### Deploy to Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy fetch-recipe-image

# Set environment variables
supabase secrets set PEXELS_API_KEY=your-key
supabase secrets set UNSPLASH_ACCESS_KEY=your-key
supabase secrets set PIXABAY_KEY=your-key
supabase secrets set DIFFUSION_ENDPOINT=http://your-diffusion-service:7861
supabase secrets set IMAGE_API_KEY=your-custom-api-key
supabase secrets set ALLOW_PUBLIC_IMAGE_REQUESTS=false
```

### Local Development

```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve fetch-recipe-image --env-file .env

# Test locally
curl -X POST http://localhost:54321/functions/v1/fetch-recipe-image \
  -H "Authorization: Bearer YOUR_LOCAL_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Pasta Carbonara",
    "tags": ["pasta", "italian", "dinner"],
    "cuisine": "Italian"
  }'
```

## Testing

See `test_function.sh` for comprehensive test cases.

```bash
# Run tests
bash test_function.sh
```

## Performance

- **Stock images**: 1-5 seconds (depends on API latency)
- **AI generation**: 15-60 seconds (depends on hardware)
- **Cached images**: <100ms (immediate return)

## Rate Limits

Free tier limits:
- **Pexels**: 200 requests/hour
- **Unsplash**: 50 requests/hour
- **Pixabay**: No official limit (fair use)

**Recommendation**: Use deduplication and caching to minimize API calls.

## Troubleshooting

### Function not found
```bash
# List deployed functions
supabase functions list

# Redeploy
supabase functions deploy fetch-recipe-image
```

### Authentication errors
```bash
# Check environment variables
supabase secrets list

# Update secrets
supabase secrets set IMAGE_API_KEY=new-key
```

### Timeout errors
- Stock search timing out: Check API keys
- AI generation timing out: Check diffusion service is running
- Increase function timeout in Supabase dashboard (max 300s)

## Security

- ✅ CORS headers configured
- ✅ Input validation (UUID format, required fields)
- ✅ Authentication required (configurable)
- ✅ Error handling (no stack traces in production)
- ✅ Rate limiting (via Supabase)

## Integration Example

```typescript
// Next.js API route
export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(
    'https://your-project.supabase.co/functions/v1/fetch-recipe-image',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipeId: body.recipeId,
        name: body.recipeName,
        tags: body.tags,
        category: body.category,
        cuisine: body.cuisine,
      }),
    }
  );

  const data = await response.json();

  return Response.json(data);
}
```

## Monitoring

View logs in Supabase dashboard:
1. Go to Edge Functions
2. Select `fetch-recipe-image`
3. Click "Logs"

Or via CLI:
```bash
supabase functions logs fetch-recipe-image
```

## Support

For issues:
1. Check function logs
2. Verify environment variables
3. Test locally first
4. Check API key validity
