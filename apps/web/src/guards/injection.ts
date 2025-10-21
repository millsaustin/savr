type InjectionRule = {
  rule: string;
  pattern: RegExp;
};

const INJECTION_RULES: InjectionRule[] = [
  {
    rule: 'IGNORE_PREVIOUS',
    pattern: /ignore\s+(?:all|any)?\s*(?:previous|prior)\s+(?:instructions|directions)/i,
  },
  {
    rule: 'DISREGARD_INSTRUCTIONS',
    pattern: /disregard\s+(?:these|the)\s+instructions/i,
  },
  {
    rule: 'CHANGE_SYSTEM_PROMPT',
    pattern: /change\s+(?:the\s+)?system\s+prompt/i,
  },
  {
    rule: 'PERFORM_TOOL_CALL',
    pattern: /perform\s+(?:a\s+)?tool\s+call/i,
  },
  {
    rule: 'CALL_INTERNAL_FUNCTION',
    pattern: /call\s+(?:an\s+)?internal\s+function/i,
  },
  {
    rule: 'REVEAL_CHAIN_OF_THOUGHT',
    pattern: /reveal\s+(?:your\s+)?chain[- ]?of[- ]?thought/i,
  },
];

const HTML_REGEX = /<[^>]+>/;
const URL_REGEX = /\bhttps?:\/\/\S+|\bwww\.\S+/i;

export function detectInjection(
  text: string,
): { injected: boolean; rule?: string } {
  const normalized = text.normalize('NFKC');

  for (const candidate of INJECTION_RULES) {
    if (candidate.pattern.test(normalized)) {
      return { injected: true, rule: candidate.rule };
    }
  }

  if (HTML_REGEX.test(normalized) || URL_REGEX.test(normalized)) {
    return { injected: true, rule: 'HTML_OR_URL' };
  }

  return { injected: false };
}
