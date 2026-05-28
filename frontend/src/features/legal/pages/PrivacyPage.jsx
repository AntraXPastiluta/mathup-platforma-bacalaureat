import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { getPrivacyPolicySections, getPrivacyPolicyTitle } from '../../../content/legal/privacyPolicy.ro'
import { LEGAL_DOCS_VERSION } from '../../../content/legal/legalConstants'
import { LegalDocumentBody } from '../../../shared/ui/LegalDocumentBody'
import { Button } from '../../../shared/ui/Button'
import { BrandLogo } from '../../../shared/ui/BrandLogo'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-border bg-white/80 backdrop-blur dark:bg-slate-900/80">
        <div className="container flex items-center justify-between py-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-white shadow-lg">
              <BrandLogo className="size-5" />
            </div>
            <strong className="text-xl font-black tracking-tighter uppercase text-slate-900 dark:text-white">MathUP</strong>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-2 rounded-xl text-slate-500">
            <ChevronLeft className="size-4" />
            Înapoi
          </Button>
        </div>
      </header>

      <main className="container max-w-3xl py-16">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary">Document legal</p>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {getPrivacyPolicyTitle()}
        </h1>
        <p className="mb-10 text-xs font-bold uppercase tracking-widest text-slate-400">
          Versiune {LEGAL_DOCS_VERSION}
        </p>
        <LegalDocumentBody sections={getPrivacyPolicySections()} />
      </main>
    </div>
  )
}
