'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ScopeChips } from '../(chat)/components/ScopeChips';

type ResponseStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'success'; message: string }
  | { state: 'guardrail'; reason: string; details?: string }
  | { state: 'error'; message: string };

export default function AssistantPage() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<ResponseStatus>({ state: 'idle' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle deep-linking from home page meal plan cards
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const intent = params.get('intent');

      if (intent) {
        const intentMap: Record<string, string> = {
          mediterranean: 'Plan a week of Mediterranean meals with easy recipes and a grocery list.',
          'high-protein': 'Create high-protein meals for muscle gain with balanced macros.',
          keto: 'Build a keto-friendly meal plan with low-carb, high-fat recipes.',
        };
        const suggestion = intentMap[intent] || '';
        if (suggestion) {
          setPrompt(suggestion);
        }
      }
    }
  }, []);

  const handleSelectExample = useCallback((example: string) => {
    setPrompt(example);
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      return;
    }

    setStatus({ state: 'loading' });

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.guardrail) {
          setStatus({
            state: 'guardrail',
            reason: data.message || 'Your request did not meet our content guidelines.',
            details: data.details,
          });
        } else {
          setStatus({
            state: 'error',
            message: data.error?.message || 'Unable to process your request right now.',
          });
        }
        return;
      }

      setStatus({
        state: 'success',
        message: data.result || 'Response received successfully.',
      });
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Network error occurred.',
      });
    }
  }, [prompt]);

  return (
    <div className="space-y-10">
      <div className="max-w-3xl space-y-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-primary">
          AI Assistant
        </p>
        <h1 className="text-4xl font-semibold text-teal-900 md:text-5xl">
          Chat with AI to build your next meal plan
        </h1>
        <p className="text-base text-gray-700">
          Get personalized recipe suggestions, convert pantry leftovers into fresh meal ideas, and receive macro-balanced meal plans tailored to your goals.
        </p>
      </div>

      <div className="space-y-4">
        <ScopeChips onSelectExample={handleSelectExample} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="prompt" className="block">
            <span className="text-sm font-medium text-gray-700">Your request</span>
            <textarea
              id="prompt"
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Plan three family-friendly dinners under $60."
              rows={4}
              className="mt-2 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-gray-800 placeholder-gray-400 transition focus:border-brand-primary focus:outline-none focus:ring focus:ring-brand-primary/30"
              disabled={status.state === 'loading'}
            />
          </label>

          <button
            type="submit"
            disabled={status.state === 'loading' || !prompt.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark focus:outline-none focus-visible:ring focus-visible:ring-brand-primary/50 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {status.state === 'loading' ? 'Processing...' : 'Submit'}
          </button>
        </form>

        {status.state === 'success' && (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="text-sm font-semibold text-emerald-900">Response</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-800">
              {status.message}
            </p>
          </div>
        )}

        {status.state === 'guardrail' && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">Content Notice</h3>
            <p className="mt-2 text-sm text-amber-800">{status.reason}</p>
            {status.details && (
              <p className="mt-1 text-xs text-amber-700">{status.details}</p>
            )}
          </div>
        )}

        {status.state === 'error' && (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <h3 className="text-sm font-semibold text-rose-900">Error</h3>
            <p className="mt-2 text-sm text-rose-800">{status.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
