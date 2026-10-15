import { useState } from 'react';
import { isFirebaseConfigured } from '../../firebase/config';

export default function FirebaseSetupBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (isFirebaseConfigured || dismissed) {
    return null;
  }

  return (
    <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 px-4 py-3 text-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">
            !
          </span>
          <p className="text-amber-200">
            <strong className="font-semibold text-white">Firebase is not configured:</strong> Browsing works in guest mode. Add the Firebase config as GitHub Actions secrets to enable sign-in and saved lists.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs text-slate-400 hover:text-white"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
