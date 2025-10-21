import { NextResponse } from 'next/server';
import { withGuards, type GuardedRequest, type NextRouteHandlerContext } from '../../../src/guards/withGuards';

async function assistantHandler(request: GuardedRequest, _context: NextRouteHandlerContext) {
  const sanitizedPrompt = request.savr?.sanitizedPrompt || '';
  const intent = request.savr?.guard?.intent || 'UNKNOWN';

  // For now, return a simple acknowledgment
  // In production, this would call OpenAI or your LLM
  return NextResponse.json({
    result: `[DEMO] Received your ${intent.toLowerCase()} request: "${sanitizedPrompt}"\n\nThis would normally call OpenAI to generate a personalized meal plan. The guardrails passed successfully!`,
    intent,
    onTopicScore: request.savr?.guard?.onTopicScore,
  });
}

export const POST = withGuards(assistantHandler);
