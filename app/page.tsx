import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen text-foreground flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">

        {/* Brand */}
        <div className="mb-12 text-center space-y-6">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-slate-900 text-white shadow-2xl mb-4 ring-8 ring-slate-50">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900">
            Bias Audit Platform
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-slate-500 font-medium leading-relaxed">
            Professional automated fairness testing for machine learning models.
            <br className="hidden md:block" />
            Compliant with Indian RBI FREE-AI & Article 15.
          </p>
        </div>

        {/* Main Action - Upload */}
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-8 text-center space-y-6">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-2">New Audit</h3>
                <p className="text-slate-500">Upload CSV datasets to detecting bias</p>
              </div>

              <Link
                href="/app"
                className="flex items-center justify-center w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Dataset
              </Link>

              <div className="flex justify-center gap-4 text-xs font-medium text-slate-400 uppercase tracking-wider">
                <span>CSV</span>
                <span>•</span>
                <span>PDF</span>
                <span>•</span>
                <span>Secure</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Footer */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl w-full px-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <strong className="block text-lg text-slate-900">Outcome Analysis</strong>
            <p className="text-slate-500">Detects bias in results and decision patterns, regardless of model internal complexity.</p>
          </div>
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <strong className="block text-lg text-slate-900">RBI Compliant</strong>
            <p className="text-slate-500"> Checks against Indian Regulations (Article 15 & FREE-AI) for financial fairness.</p>
          </div>
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <strong className="block text-lg text-slate-900">Transparent</strong>
            <p className="text-slate-500">Deterministic statistical reporting with no hidden algorithms or black boxes.</p>
          </div>
        </div>

      </main>
    </div>
  );
}
