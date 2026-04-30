import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { isFirebaseConfigured } from "../firebase";
import { ChefHat, Loader2 } from "lucide-react";

export function SignIn() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn();
    } catch (err) {
      setError((err as Error).message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-brand-50 to-brand-100">
      <div className="card w-full max-w-md p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-600 text-white flex items-center justify-center mb-6">
          <ChefHat className="w-8 h-8" strokeWidth={1.6} />
        </div>
        <h1 className="text-2xl font-semibold text-brand-900 mb-2">
          Catering — Weekly Orders
        </h1>
        <p className="text-brand-700 mb-8">
          Sign in with the catering team Google account to continue.
        </p>
        <button
          onClick={onClick}
          disabled={busy}
          className="focus-ring w-full inline-flex items-center justify-center gap-3 px-5 py-3 rounded-lg bg-white border border-brand-200 hover:bg-brand-50 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          <span className="font-medium text-brand-800">
            {busy ? "Signing in…" : "Sign in with Google"}
          </span>
        </button>
        {error && (
          <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </p>
        )}
        {!isFirebaseConfigured && (
          <p className="mt-6 text-xs text-brand-600 bg-brand-50 border border-brand-200 rounded p-3">
            Demo mode — Firebase isn't configured yet, so this signs you in
            without a Google account. Data is stored only in your browser.
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.331A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.708A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.708V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.04l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961l3.007 2.331C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
