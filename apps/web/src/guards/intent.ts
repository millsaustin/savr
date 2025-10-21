import { guardrailsConfig } from '../config/guardrails';
import { onTopicScore } from './topic-router';

export type Intent =
  | 'MEAL_GENERATE'
  | 'FROM_PANTRY'
  | 'GROCERY_AGG'
  | 'PROFILE'
  | 'OFF_TOPIC';

type IntentRule = {
  intent: Exclude<Intent, 'MEAL_GENERATE' | 'OFF_TOPIC'>;
  keywords: string[];
};

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'FROM_PANTRY',
    keywords: ['pantry', 'cupboard', 'on hand'],
  },
  {
    intent: 'GROCERY_AGG',
    keywords: ['grocery', 'list', 'cart', 'aggregate'],
  },
  {
    intent: 'PROFILE',
    keywords: [
      'profile',
      'preferences',
      'personality',
      'diet',
      'allergy',
      'restrictions',
    ],
  },
];

const MEAL_KEYWORDS = ['meal', 'recipe', 'plan', 'cook', 'dinner', 'lunch'];

function containsAny(source: string, keywords: string[]): boolean {
  return keywords.some((keyword) => source.includes(keyword));
}

export async function classifyIntent(text: string): Promise<Intent> {
  const normalized = text.normalize('NFKC').toLowerCase();

  for (const rule of INTENT_RULES) {
    if (containsAny(normalized, rule.keywords)) {
      return rule.intent;
    }
  }

  if (containsAny(normalized, MEAL_KEYWORDS)) {
    return 'MEAL_GENERATE';
  }

  const score = await onTopicScore(text);
  if (score >= guardrailsConfig.guardSimilarityThreshold) {
    return 'MEAL_GENERATE';
  }

  return 'OFF_TOPIC';
}
