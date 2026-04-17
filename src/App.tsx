import "./App.css";
import { atom } from "jotai";
import Planner from "./pages/Planner/Planner";
import type { Schedule } from "./types/planner.types";
import SchedulePage from "./pages/Calendar/Calendar";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home/Home";

export const fileAtom = atom<File | null>(null);
export const schedulesAtom = atom<Schedule[] | null>(null);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/calendar" element={<SchedulePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
