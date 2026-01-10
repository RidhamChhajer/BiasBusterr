import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            Bias Buster
          </h1>
          <div className="mt-2 h-1 w-24 bg-blue-600 mx-auto rounded-full"></div>
        </div>

        {/* Tagline */}
        <p className="mt-6 max-w-2xl text-center text-xl text-slate-600 dark:text-slate-300">
          A responsible AI platform that helps you detect potential bias in
          datasets and AI-driven decision systems through outcome analysis and
          statistical methods.
        </p>

        {/* Features */}
        <div className="mt-12 max-w-3xl">
          <ul className="space-y-4 text-lg text-slate-700 dark:text-slate-200">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold mt-0.5">
                ✓
              </span>
              <span>
                <strong className="font-semibold">Outcome-Based Analysis:</strong>{" "}
                Detect bias through statistical patterns and outcome disparities,
                not internal model weights
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold mt-0.5">
                ✓
              </span>
              <span>
                <strong className="font-semibold">Deterministic Detection:</strong>{" "}
                All bias findings are based on rule-based checks and statistical
                tests, never AI-generated
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold mt-0.5">
                ✓
              </span>
              <span>
                <strong className="font-semibold">Transparent Results:</strong>{" "}
                Every finding includes uncertainty levels, limitations, and
                clear explanations
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold mt-0.5">
                ✓
              </span>
              <span>
                <strong className="font-semibold">Multiple Data Sources:</strong>{" "}
                Upload CSV files, PDFs, or images for analysis with user
                confirmation
              </span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <div className="mt-12">
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Now
          </Link>
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
          No absolute claims. No hidden algorithms. Just transparent,
          statistical bias detection.
        </p>
      </main>
    </div>
  );
}

