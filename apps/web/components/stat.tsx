interface StatProps {
  label: string;
  value: string;
  helperText?: string;
}

const Stat = ({ label, value, helperText }: StatProps) => (
  <div className="rounded-2xl border border-white/10 bg-neutral-900/50 px-6 py-5 shadow-lg">
    <dt className="text-xs font-semibold uppercase tracking-widest text-slate-400">
      {label}
    </dt>
    <dd className="mt-2 text-3xl font-semibold text-brand-sand">{value}</dd>
    {helperText ? (
      <p className="mt-1 text-xs text-slate-400">{helperText}</p>
    ) : null}
  </div>
);

export default Stat;
