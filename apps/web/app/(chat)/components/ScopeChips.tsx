'use client';

import { useCallback } from 'react';

type ScopeChip = {
  id: 'recipes' | 'pantry' | 'groceries';
  label: string;
  example: string;
};

const CHIPS: ScopeChip[] = [
  {
    id: 'recipes',
    label: 'Recipes',
    example: 'Plan three family-friendly dinners under $60.',
  },
  {
    id: 'pantry',
    label: 'Pantry',
    example: 'Use my pantry staples to make two quick lunches.',
  },
  {
    id: 'groceries',
    label: 'Groceries',
    example: 'Aggregate a grocery list for four high-protein meals.',
  },
];

export type ScopeChipsProps = {
  onSelectExample(example: string): void;
};

export function ScopeChips({ onSelectExample }: ScopeChipsProps) {
  const handleSelect = useCallback(
    (example: string) => {
      onSelectExample(example);
    },
    [onSelectExample],
  );

  return (
    <div className="flex flex-wrap gap-2" aria-label="Prompt scopes">
      {CHIPS.map((chip) => (
        <span
          key={chip.id}
          role="button"
          tabIndex={0}
          className="select-none rounded-full border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 transition hover:border-brand-primary hover:text-brand-primary focus:outline-none focus-visible:ring focus-visible:ring-brand-primary/50"
          onClick={() => handleSelect(chip.example)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleSelect(chip.example);
            }
          }}
          aria-label={`Use ${chip.label} example`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export default ScopeChips;
