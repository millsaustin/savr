const URL_REGEX = /\bhttps?:\/\/\S+|\bwww\.\S+/gi;
const HTML_REGEX = /<[^>]+>/gi;
const MULTISPACE_REGEX = /\s+/g;
const DEFAULT_MAX_LENGTH = 1500;

export function sanitizeInput(
  value: string,
  maxLength = DEFAULT_MAX_LENGTH,
): { cleaned: string; tooLong: boolean; hadUrls: boolean } {
  const normalized = value.normalize('NFKC');

  const urlMatch = URL_REGEX.test(normalized);
  URL_REGEX.lastIndex = 0;

  const htmlMatch = HTML_REGEX.test(normalized);
  HTML_REGEX.lastIndex = 0;

  const removedUrls = normalized.replace(URL_REGEX, ' ');
  const removedHtml = removedUrls.replace(HTML_REGEX, ' ');

  const collapsed = removedHtml.replace(MULTISPACE_REGEX, ' ').trim();
  const truncated = collapsed.slice(0, maxLength);

  return {
    cleaned: truncated,
    tooLong: collapsed.length > maxLength,
    hadUrls: urlMatch || htmlMatch,
  };
}
