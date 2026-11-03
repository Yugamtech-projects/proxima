import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/components/Admin/AdminPortalModal.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Locate start of return statement
const returnToken = `  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in select-none">`;

const authStateToken = `          ) : (
            /* AUTHENTICATED STATE */
            <div className="space-y-4">`;

const startIdx = content.indexOf(returnToken);
if (startIdx === -1) {
  console.error('Could not find returnToken');
  process.exit(1);
}

const authStateIdx = content.indexOf(authStateToken);
if (authStateIdx === -1) {
  console.error('Could not find authStateToken');
  process.exit(1);
}

const unauthenticatedBlock = `  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in select-none">
      {!adminSession ? (
        /* Pristine Apple-Grade Executive Login Card */
        <div className="bg-white w-full max-w-[420px] rounded-[32px] sm:rounded-[36px] shadow-[0_24px_70px_rgba(15,23,42,0.24)] border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
          {/* Top Right Close Button */}
          <button
            onClick={onClose}
            className="ios-press absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer z-10"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Clean Executive Content */}
          <div className="p-7 sm:p-8 space-y-5">
            {/* Emblem & Titles */}
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white p-1 ring-1 ring-black/5 shadow-[0_8px_20px_rgba(0,113,227,0.12)] flex items-center justify-center mx-auto relative group">
                <img
                  src="/proxima-icon.jpg"
                  alt="Proxima Logo"
                  className="w-full h-full rounded-[14px] object-cover"
                />
              </div>

              <div className="space-y-1">
                <h3 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                  Executive Portal
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Sign in with administrative credentials to manage chapter operations and licenses.
                </p>
              </div>

              {/* Context Chapter Indicator (if opened from a specific chapter) */}
              {contextChapter && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  <span>{contextChapter.name}</span>
                </div>
              )}
            </div>

            {/* Active Lockout Banner */}
            {rateLimitStatus.isLocked && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2.5 text-xs font-semibold text-amber-900 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
                  <span>
                    Lockout Active: <strong>{rateLimitStatus.remainingSeconds}s</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetSecurityLockout}
                  className="text-[10px] font-bold text-amber-800 bg-amber-200/70 hover:bg-amber-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Authentication Error Feedback */}
            {authError && !rateLimitStatus.isLocked && (
              <div className="p-3 bg-red-50 border border-red-200/80 rounded-2xl flex items-center justify-between gap-2 text-xs font-medium text-red-700 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="truncate">{authError}</span>
                </div>
                {rateLimitStatus.failedAttempts > 0 && (
                  <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full flex-shrink-0 font-mono-num">
                    {rateLimitStatus.failedAttempts}/5
                  </span>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Login ID
                </label>
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="e.g. admin or titans.admin"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/12 text-sm text-slate-800 transition-all font-medium placeholder:text-slate-400 disabled:opacity-50"
                  required
                  autoFocus
                  disabled={rateLimitStatus.isLocked || isAuthenticating}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="Enter security password"
                    className="w-full h-11 pl-3.5 pr-11 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0071E3] focus:ring-4 focus:ring-[#0071E3]/12 text-sm text-slate-800 transition-all font-medium placeholder:text-slate-400 disabled:opacity-50"
                    required
                    disabled={rateLimitStatus.isLocked || isAuthenticating}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ios-press absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={rateLimitStatus.isLocked || isAuthenticating}
                className="btn-proxima-primary w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_14px_rgba(0,113,227,0.28)] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white/90" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Executive Portal</span>
                    <ArrowRight className="w-4 h-4 text-white/80" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credential Helper */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>
                Demo: <strong className="text-slate-600 font-mono">admin</strong> / <strong className="text-slate-600 font-mono">admin123</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmailInput('admin');
                  setPasswordInput('admin123');
                  if (authError) setAuthError(null);
                }}
                className="text-[#0071E3] hover:text-[#005bb5] font-semibold transition-colors cursor-pointer"
              >
                Auto-fill
              </button>
            </div>

            {/* Security Notice */}
            <div className="text-center pt-1">
              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>256-bit Encrypted Session · Sovereign Directory Architecture</span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated Executive Management Portal */
        <div className="bg-[#F8F9FD] w-full max-w-4xl max-h-[92vh] rounded-[36px] shadow-[0_32px_90px_rgba(15,23,42,0.4)] border border-white/95 overflow-hidden flex flex-col transition-all duration-300">
          
          {/* Modal Top Header */}
          <div className="px-6 py-4 border-b border-black/[0.06] flex items-center justify-between bg-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-[#1D1D1F]">
                    PROXIMA <span className="text-[10px] text-slate-400 font-medium">by Yugam</span>
                  </h3>
                  <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full border \${
                    isMasterAdmin
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-[#0071E3] border-blue-200'
                  }\`}>
                    {isMasterAdmin ? 'Master Super Admin' : \`\${effectiveChapter.name} Admin\`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Active Chapter: {effectiveChapter.name} ({effectiveChapter.city})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="ios-press px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Sign out of portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
              <button
                onClick={onClose}
                className="ios-press w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Close portal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
            
            {/* Feedback banner */}
            {feedbackMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            {/* AUTHENTICATED STATE */}
            <div className="space-y-4">`;

content = content.slice(0, startIdx) + unauthenticatedBlock + content.slice(authStateIdx + authStateToken.length);

// 2. Fix the closing tag at line 3234
const oldTernaryEnd = `                  </div>

                  
                </div>
              )}
            </div>
          )}
        </div>`;

const newTernaryEnd = `                  </div>

                  
                </div>
              )}
            </div>
          </div>`;

if (!content.includes(oldTernaryEnd)) {
  console.error('Could not find oldTernaryEnd');
  process.exit(1);
}
content = content.replace(oldTernaryEnd, newTernaryEnd);

// 3. Fix the closing tag at the end of the modal
const oldEnd = `        {/* Bulk Member Spreadsheet Importer Modal */}
        <BulkMemberImporterModal
          isOpen={isBulkImporterOpen}
          onClose={() => setIsBulkImporterOpen(false)}
          chapter={effectiveChapter}
          onImportComplete={handleSpreadsheetImportComplete}
        />

      </div>
    </div>
  )
}`;

const newEnd = `        {/* Bulk Member Spreadsheet Importer Modal */}
        <BulkMemberImporterModal
          isOpen={isBulkImporterOpen}
          onClose={() => setIsBulkImporterOpen(false)}
          chapter={effectiveChapter}
          onImportComplete={handleSpreadsheetImportComplete}
        />

        </div>
      )}
    </div>
  )
}`;

if (!content.includes(oldEnd)) {
  console.error('Could not find oldEnd');
  process.exit(1);
}
content = content.replace(oldEnd, newEnd);

// 4. Fix non-standard Tailwind scale classes
content = content.replace(/py-0\.2/g, 'py-0.5');
content = content.replace(/shadow-2xs/g, 'shadow-xs');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AdminPortalModal.tsx');
