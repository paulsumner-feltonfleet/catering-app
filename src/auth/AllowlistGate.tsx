import type { ReactNode } from "react";
import { ShieldOff } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { SignIn } from "./SignIn";
import { ALLOWED_EMAILS } from "../types";

export function AllowlistGate({ children }: { children: ReactNode }) {
  const { user, loading, isAllowed, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brand-600">
        Loading…
      </div>
    );
  }

  if (!user) return <SignIn />;

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-brand-50">
        <div className="card w-full max-w-md p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-6">
            <ShieldOff className="w-8 h-8" strokeWidth={1.6} />
          </div>
          <h1 className="text-xl font-semibold text-brand-900 mb-2">
            This account isn't authorised
          </h1>
          <p className="text-brand-700 mb-2">
            Signed in as <span className="font-medium">{user.email}</span>.
          </p>
          <p className="text-sm text-brand-600 mb-6">
            Only these accounts have access:
            <br />
            {ALLOWED_EMAILS.map((e) => (
              <span key={e} className="block font-mono text-xs mt-1">
                {e}
              </span>
            ))}
          </p>
          <button
            onClick={() => signOut()}
            className="focus-ring px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
