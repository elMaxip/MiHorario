import { useAtomValue } from "jotai";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { HomePage } from "@/features/home/HomePage";
import { PlannerPage } from "@/features/planner/PlannerPage";
import { useCreateSchedules } from "@/features/planner/useCreateSchedules";
import { SchedulesPage } from "@/features/schedules/SchedulesPage";
import { offeringAtom } from "@/state/atoms";
import { TopBar, type Step } from "@/ui/TopBar";

function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { create } = useCreateSchedules();
  const step: Step | null = pathname === "/planificador" ? 2 : pathname === "/horarios" ? 3 : null;

  const onStep = (s: Step) => {
    if (s === 1) navigate("/");
    else if (s === 2) navigate("/planificador");
    else void create();
  };

  return (
    <>
      <TopBar step={step} onHome={() => navigate("/")} onStep={onStep} />
      <Outlet />
    </>
  );
}

/** Sin archivo cargado (por ejemplo, tras recargar) se vuelve al inicio (D2). */
function RequireOffering() {
  const offering = useAtomValue(offeringAtom);
  if (!offering) return <Navigate to="/" replace state={{ notice: "reupload" }} />;
  return <Outlet />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route element={<RequireOffering />}>
            <Route path="planificador" element={<PlannerPage />} />
            <Route path="horarios" element={<SchedulesPage />} />
          </Route>
          <Route path="planner" element={<Navigate to="/planificador" replace />} />
          <Route path="calendar" element={<Navigate to="/horarios" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
