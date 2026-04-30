import { AlertTriangle } from "lucide-react";

export function ErrorCard({ message }: { message: string }) {
  return (
    <div className="card p-8 text-center max-w-2xl mx-auto">
      <div className="mx-auto w-12 h-12 rounded-xl bg-red-100 text-red-700 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <p className="font-medium text-brand-900 mb-2">Couldn't load data</p>
      <p className="text-sm text-brand-700">{message}</p>
    </div>
  );
}
