import { NavLink } from "react-router-dom";
import { Container } from "./Container";
import { Toggle } from "./Toggle";
import { cn } from "../lib/utils";
import { Sparkles, NotebookPen, BarChart3, CalendarCheck } from "lucide-react";

export function AppShell({
  privacyMode,
  setPrivacyMode,
  children,
}: {
  privacyMode: boolean;
  setPrivacyMode: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-sky-50 to-white">
      <header className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/60 backdrop-blur">
        <Container className="py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <Sparkles size={18} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-900">
                Solace Journal
              </div>
              <div className="text-xs text-slate-600">
                A gentle place to think out loud.
              </div>
            </div>
          </div>

          <Toggle
            checked={privacyMode}
            onChange={setPrivacyMode}
            label="Privacy Mode"
            sublabel={
              privacyMode
                ? "All analysis runs locally in your browser."
                : "Optional enhanced insights can use an API later."
            }
          />
        </Container>

        <Container className="pb-3">
          <nav className="flex gap-2">
            <Tab to="/journal" icon={<NotebookPen size={16} />}>
              Journal
            </Tab>
            <Tab to="/insights" icon={<BarChart3 size={16} />}>
              Insights
            </Tab>
            <Tab to="/reflection" icon={<CalendarCheck size={16} />}>
              Weekly
            </Tab>
          </nav>
        </Container>
      </header>

      <main>
        <Container className="py-6">{children}</Container>
      </main>
    </div>
  );
}

function Tab({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition",
          isActive
            ? "bg-slate-900 text-white shadow-sm"
            : "bg-white/70 text-slate-700 hover:bg-white border border-slate-200"
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}
