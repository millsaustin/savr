// stockImageClient.ts - Free stock image search with smart filtering and scoring
// Downloads images for rehosting (never hotlinks)

/////////////////////////////
// TYPES
/////////////////////////////

type RecipeImageMeta = {
  name: string;
  tags: string[];
  category?: string;
  cuisine?: string;
};

type StockCandidate = {
  url: string;
  width: number;
  height: number;
  title?: string;
  alt?: string;
  provider: 'pexels' | 'unsplash' | 'pixabay';
  photographer?: string;
  licenseUrl?: string;
};

type DownloadedImage = {
  buffer: Uint8Array;
  provider: 'pexels' | 'unsplash' | 'pixabay';
  photographer?: string;
  licenseUrl?: string;
};

/////////////////////////////
// CONFIGURATION
/////////////////////////////

const PEXELS_API_KEY = Deno.env.get('PEXELS_API_KEY');
const UNSPLASH_ACCESS_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY');
const PIXABAY_KEY = Deno.env.get('PIXABAY_KEY');

const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;
const MIN_IMAGE_WIDTH = 1024;
const MIN_SCORE_THRESHOLD = 30; // Minimum score to accept an image

/////////////////////////////
// MAIN ENTRY POINT
/////////////////////////////

export async function tryStock(meta: RecipeImageMeta): Promise<DownloadedImage | null> {
  console.log('[tryStock] Starting stock image search for:', meta.name);

  // 1) Build search queries with fallbacks
  const queries = buildSearchQueries(meta);
  console.log('[tryStock] Search queries:', queries);

  // 2) Try each provider in order: Pexels → Unsplash → Pixabay
  const providers: Array<{
    name: 'pexels' | 'unsplash' | 'pixabay';
    enabled: boolean;
    queryFn: (q: string) => Promise<StockCandidate[]>;
  }> = [
    { name: 'pexels', enabled: !!PEXELS_API_KEY, queryFn: queryPexels },
    { name: 'unsplash', enabled: !!UNSPLASH_ACCESS_KEY, queryFn: queryUnsplash },
    { name: 'pixabay', enabled: !!PIXABAY_KEY, queryFn: queryPixabay },
  ];

  for (const provider of providers) {
    if (!provider.enabled) {
      console.log(`[tryStock] Skipping ${provider.name} (no API key)`);
      continue;
    }

    console.log(`[tryStock] Trying ${provider.name}...`);

    // Try each query until we find a good candidate
    for (const query of queries) {
      try {
        const candidates = await provider.queryFn(query);
        console.log(`[tryStock] ${provider.name} returned ${candidates.length} candidates for "${query}"`);

        if (candidates.length === 0) continue;

        // 3) Score and sort candidates
        const scored = candidates
          .map(c => ({ candidate: c, score: scoreCandidate(c, meta) }))
          .filter(s => s.score >= MIN_SCORE_THRESHOLD)
          .sort((a, b) => b.score - a.score);

        if (scored.length === 0) {
          console.log(`[tryStock] No candidates passed score threshold for ${provider.name}`);
          continue;
        }

        const best = scored[0];
        console.log(`[tryStock] Best candidate: score=${best.score}, url=${best.candidate.url.substring(0, 80)}...`);

        // 4) Download the best candidate
        const buffer = await downloadToBuffer(best.candidate.url);

        if (buffer) {
          console.log(`[tryStock] Successfully downloaded image from ${provider.name}`);
          return {
            buffer,
            provider: best.candidate.provider,
            photographer: best.candidate.photographer,
            licenseUrl: best.candidate.licenseUrl,
          };
        }

        console.log(`[tryStock] Failed to download image, trying next candidate...`);
      } catch (error) {
        console.error(`[tryStock] Error querying ${provider.name}:`, error);
        // Continue to next query/provider
      }
    }
  }

  // 5) No suitable image found from any provider
  console.log('[tryStock] No suitable stock image found');
  return null;
}

/////////////////////////////
// QUERY BUILDERS
/////////////////////////////

function buildSearchQueries(meta: RecipeImageMeta): string[] {
  const queries: string[] = [];

  // Extract key tags
  const proteins = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'tofu', 'turkey', 'lamb'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'appetizer'];

  const primaryProtein = meta.tags.find(t => proteins.includes(t.toLowerCase()));
  const mealType = meta.tags.find(t => mealTypes.includes(t.toLowerCase()));

  // Query 1: Full context (name + protein + meal type)
  if (primaryProtein && mealType) {
    queries.push(`${meta.name} ${primaryProtein} ${mealType} food`);
  }

  // Query 2: Name + protein
  if (primaryProtein) {
    queries.push(`${meta.name} ${primaryProtein} dish`);
  }

  // Query 3: Name + cuisine
  if (meta.cuisine) {
    queries.push(`${meta.name} ${meta.cuisine} food`);
  }

  // Query 4: Just the dish name
  queries.push(`${meta.name} food`);

  // Query 5: Cuisine fallback
  if (meta.cuisine) {
    queries.push(`${meta.cuisine} cuisine dish`);
  }

  // Query 6: Category fallback
  if (meta.category) {
    queries.push(`${meta.category} meal food`);
  }

  // Remove duplicates and limit to 4 queries max
  return [...new Set(queries)].slice(0, 4);
}

/////////////////////////////
// PROVIDER IMPLEMENTATIONS
/////////////////////////////

async function queryPexels(query: string): Promise<StockCandidate[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`;

  const response = await fetchWithRetry(url, {
    headers: {
      'Authorization': PEXELS_API_KEY!,
    },
  });

  if (!response.ok) {
    console.error(`[Pexels] HTTP ${response.status}: ${response.statusText}`);
    return [];
  }

  const data = await response.json();

  if (!data.photos || data.photos.length === 0) {
    return [];
  }

  return data.photos
    .filter((photo: any) => photo.width >= MIN_IMAGE_WIDTH)
    .map((photo: any) => ({
      url: photo.src.large2x || photo.src.large,
      width: photo.width,
      height: photo.height,
      title: photo.alt,
      alt: photo.alt,
      provider: 'pexels' as const,
      photographer: photo.photographer,
      licenseUrl: photo.url,
    }));
}

async function queryUnsplash(query: string): Promise<StockCandidate[]> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    console.error(`[Unsplash] HTTP ${response.status}: ${response.statusText}`);
    return [];
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return [];
  }

  return data.results
    .filter((photo: any) => photo.width >= MIN_IMAGE_WIDTH)
    .map((photo: any) => ({
      url: photo.urls.regular,
      width: photo.width,
      height: photo.height,
      title: photo.description || photo.alt_description,
      alt: photo.alt_description,
      provider: 'unsplash' as const,
      photographer: photo.user?.name,
      licenseUrl: photo.links?.html,
    }));
}

async function queryPixabay(query: string): Promise<StockCandidate[]> {
  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=10&orientation=horizontal`;

  const response = await fetchWithRetry(url);

  if (!response.ok) {
    console.error(`[Pixabay] HTTP ${response.status}: ${response.statusText}`);
    return [];
  }

  const data = await response.json();

  if (!data.hits || data.hits.length === 0) {
    return [];
  }

  return data.hits
    .filter((photo: any) => photo.imageWidth >= MIN_IMAGE_WIDTH)
    .map((photo: any) => ({
      url: photo.largeImageURL,
      width: photo.imageWidth,
      height: photo.imageHeight,
      title: photo.tags,
      alt: photo.tags,
      provider: 'pixabay' as const,
      photographer: photo.user,
      licenseUrl: photo.pageURL,
    }));
}

/////////////////////////////
// SCORING ALGORITHM
/////////////////////////////

function scoreCandidate(candidate: StockCandidate, meta: RecipeImageMeta): number {
  let score = 0;

  // Base score for passing minimum width
  if (candidate.width >= MIN_IMAGE_WIDTH) {
    score += 20;
  }

  // Bonus for larger images (up to 20 points)
  const sizeBonus = Math.min(20, Math.floor((candidate.width - MIN_IMAGE_WIDTH) / 100));
  score += sizeBonus;

  // Aspect ratio preference (1:1 to 16:9 is good for food)
  const aspectRatio = candidate.width / candidate.height;
  if (aspectRatio >= 1.0 && aspectRatio <= 1.8) {
    score += 15;
  } else if (aspectRatio > 1.8 && aspectRatio <= 2.0) {
    score += 5; // Too wide
  }

  // Title/alt text relevance
  const textContent = `${candidate.title || ''} ${candidate.alt || ''}`.toLowerCase();

  // Check for recipe name keywords
  const nameWords = meta.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const nameMatches = nameWords.filter(word => textContent.includes(word)).length;
  score += nameMatches * 10;

  // Check for tag keywords
  const tagMatches = meta.tags.filter(tag => textContent.includes(tag.toLowerCase())).length;
  score += tagMatches * 8;

  // Check for cuisine
  if (meta.cuisine && textContent.includes(meta.cuisine.toLowerCase())) {
    score += 10;
  }

  // Food-related keywords boost
  const foodKeywords = [
    'food', 'meal', 'dish', 'plate', 'bowl', 'cuisine', 'recipe',
    'delicious', 'gourmet', 'cooked', 'fresh', 'homemade', 'restaurant'
  ];
  const foodMatches = foodKeywords.filter(kw => textContent.includes(kw)).length;
  score += foodMatches * 3;

  // Composition hints (overhead/close-up preferred for food)
  const compositionKeywords = ['overhead', 'top view', 'close-up', 'macro', 'detail'];
  const compositionMatches = compositionKeywords.filter(kw => textContent.includes(kw)).length;
  score += compositionMatches * 8;

  // Penalties for non-food content
  const excludeKeywords = [
    'illustration', 'drawing', 'vector', 'logo', 'cartoon', 'icon',
    'people', 'person', 'man', 'woman', 'child', 'hands holding',
    'watermark', 'text overlay', 'graphic design'
  ];
  const excludeMatches = excludeKeywords.filter(kw => textContent.includes(kw)).length;
  score -= excludeMatches * 20;

  // Penalty for very small images
  if (candidate.width < 1280) {
    score -= 10;
  }

  // Penalty for very tall images (not typical for food)
  if (aspectRatio < 0.8) {
    score -= 15;
  }

  return Math.max(0, score); // Never negative
}

/////////////////////////////
// DOWNLOAD HELPERS
/////////////////////////////

async function downloadToBuffer(url: string): Promise<Uint8Array | null> {
  try {
    console.log(`[downloadToBuffer] Downloading: ${url.substring(0, 80)}...`);

    const response = await fetchWithRetry(url, {}, 3); // More retries for downloads

    if (!response.ok) {
      console.error(`[downloadToBuffer] HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      console.error(`[downloadToBuffer] Invalid content type: ${contentType}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Validate minimum size (at least 50KB for a decent image)
    if (buffer.length < 50_000) {
      console.error(`[downloadToBuffer] Image too small: ${buffer.length} bytes`);
      return null;
    }

    console.log(`[downloadToBuffer] Downloaded ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error('[downloadToBuffer] Error:', error);
    return null;
  }
}

/////////////////////////////
// RETRY LOGIC
/////////////////////////////

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxAttempts: number = RETRY_ATTEMPTS
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`[fetchWithRetry] Attempt ${attempt}/${maxAttempts} failed:`, error);

      if (attempt < maxAttempts) {
        const delay = RETRY_DELAY_MS * attempt; // Exponential backoff
        console.log(`[fetchWithRetry] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Fetch failed after all retries');
}

/////////////////////////////
// EXPORTS
/////////////////////////////

export {
  type RecipeImageMeta,
  type StockCandidate,
  type DownloadedImage,
  buildSearchQueries,
  queryPexels,
  queryUnsplash,
  queryPixabay,
  scoreCandidate,
  downloadToBuffer,
};
