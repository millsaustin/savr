/* eslint-disable jsx-a11y/label-has-associated-control */
'use client';

import { useCallback, useMemo, useState } from 'react';

type GuardrailControlsProps = {
  initialSimilarityThreshold: number;
  initialBlockAfterThree: boolean;
};

type Status =
  | { state: 'idle' }
  | { state: 'saving' }
  | { state: 'success'; message: string }
  | { state: 'error'; message: string };

export function GuardrailControls({
  initialSimilarityThreshold,
  initialBlockAfterThree,
}: GuardrailControlsProps) {
  const [similarityThreshold, setSimilarityThreshold] = useState(
    initialSimilarityThreshold,
  );
  const [blockAfterThree, setBlockAfterThree] = useState(
    initialBlockAfterThree,
  );
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  const roundedThreshold = useMemo(
    () => Math.round(similarityThreshold * 100) / 100,
    [similarityThreshold],
  );

  const handleSave = useCallback(async () => {
    setStatus({ state: 'saving' });
    try {
      const response = await fetch('/api/admin/guardrails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          similarityThreshold,
          blockAfterThree,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          payload?.error?.message ||
          'Unable to save guardrail settings right now.';
        throw new Error(message);
      }

      const payload = await response.json().catch(() => null);
      setSimilarityThreshold(
        payload?.current?.guardSimilarityThreshold ?? similarityThreshold,
      );
      setBlockAfterThree(
        payload?.current?.guardBlockAfterThree ?? blockAfterThree,
      );
      setStatus({
        state: 'success',
        message: 'Guardrail configuration updated.',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save guardrails.';
      setStatus({ state: 'error', message });
    }
  }, [similarityThreshold, blockAfterThree]);

  return (
    <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <header>
        <h2 className="text-base font-semibold text-neutral-800">
          Guardrail Controls
        </h2>
        <p className="text-sm text-neutral-500">
          Adjust runtime thresholds for on-topic scoring. Changes are
          in-memory only; use persistent configuration in production.
        </p>
      </header>

      <div className="space-y-3">
        <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
          Similarity Threshold ({roundedThreshold.toFixed(2)})
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={similarityThreshold}
            onChange={(event) =>
              setSimilarityThreshold(Number(event.target.value))
            }
            className="w-full accent-brand-primary"
          />
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={similarityThreshold}
            onChange={(event) =>
              setSimilarityThreshold(
                Math.min(
                  1,
                  Math.max(0, Number(event.target.value) || 0),
                ),
              )
            }
            className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <input
            type="checkbox"
            checked={blockAfterThree}
            onChange={(event) => setBlockAfterThree(event.target.checked)}
            className="h-4 w-4 accent-brand-primary"
          />
          Block users after three consecutive off-topic prompts
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={status.state === 'saving'}
          className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark focus:outline-none focus-visible:ring focus-visible:ring-brand-primary/50 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {status.state === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status.state === 'success' && (
          <span className="text-sm text-emerald-600">{status.message}</span>
        )}
        {status.state === 'error' && (
          <span className="text-sm text-rose-600">{status.message}</span>
        )}
      </div>
    </section>
  );
}

export default GuardrailControls;
