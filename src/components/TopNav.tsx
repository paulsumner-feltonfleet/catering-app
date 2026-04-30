import { NavLink } from "react-router-dom";
import { ChefHat, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { cn } from "../lib/utils";
import { isFirebaseConfigured } from "../firebase";

export function TopNav() {
  const { user, signOut } = useAuth();
  return (
    <header className="bg-white border-b border-brand-100 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <ChefHat className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <span className="font-semibold text-brand-900">Catering</span>
          {!isFirebaseConfigured && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Demo
            </span>
          )}
        </div>
        <nav className="flex items-center gap-1">
          <NavItem to="/" end>
            This week
          </NavItem>
          <NavItem to="/weeks">Past weeks</NavItem>
          <NavItem to="/items">Items</NavItem>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-brand-700">
            {user?.email}
          </span>
          <button
            onClick={() => signOut()}
            title="Sign out"
            className="focus-ring p-2 rounded-lg text-brand-700 hover:bg-brand-50 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function NavItem({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "focus-ring px-4 py-2 rounded-lg text-sm font-medium transition",
          isActive
            ? "bg-brand-600 text-white"
            : "text-brand-700 hover:bg-brand-50",
        )
      }
    >
      {children}
    </NavLink>
  );
}
