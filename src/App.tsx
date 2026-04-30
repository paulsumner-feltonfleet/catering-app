import { Navigate, Route, Routes } from "react-router-dom";
import { AllowlistGate } from "./auth/AllowlistGate";
import { TopNav } from "./components/TopNav";
import { ThisWeek } from "./pages/ThisWeek";
import { PastWeeks } from "./pages/PastWeeks";
import { WeekView } from "./pages/WeekView";
import { Items } from "./pages/Items";

export function App() {
  return (
    <AllowlistGate>
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<ThisWeek />} />
            <Route path="/weeks" element={<PastWeeks />} />
            <Route path="/weeks/:id" element={<WeekView />} />
            <Route path="/items" element={<Items />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AllowlistGate>
  );
}
