import Link from 'next/link';

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-lg space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-teal-900">Login</h1>
      <p className="text-sm text-gray-700">
        Authentication is not wired yet. Once guardrails roll out broadly, set{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-800">
          REQUIRE_AUTH=true
        </code>{' '}
        in <code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-800">.env.local</code> to enforce Supabase login.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
      >
        Return to dashboard
      </Link>
    </section>
  );
}
