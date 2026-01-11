import { NavLink } from "react-router-dom";
import { Container } from "./Container";
import { Toggle } from "./Toggle";
import { cn } from "../lib/utils";
import { Sparkles, NotebookPen, BarChart3, PencilLine } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export function AppShell({
  privacyMode,
  setPrivacyMode,
  children,
}: {
  privacyMode: boolean;
  setPrivacyMode: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const [confirmPrivacyOff, setConfirmPrivacyOff] = useState(false);

  function requestToggle(next: boolean) {
    // Confirm only when switching OFF privacy mode
    if (privacyMode === true && next === false) {
      setConfirmPrivacyOff(true);
      return;
    }
    setPrivacyMode(next);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-sky-50 to-white">
      <ConfirmDialog
        open={confirmPrivacyOff}
        title="Turn off Privacy Mode?"
        description="Enhanced reflections will use an external language model (LLM). In this prototype, that means your journal text may be sent to the API to generate a response. You can switch Privacy Mode back on anytime."
        confirmText="Yes, use Enhanced mode"
        cancelText="Keep Privacy Mode on"
        tone="neutral"
        onCancel={() => setConfirmPrivacyOff(false)}
        onConfirm={() => {
          setConfirmPrivacyOff(false);
          setPrivacyMode(false);
        }}
      />

      <header className="sticky top-0 z-10 border-b border-slate-200/60 bg-white/60 backdrop-blur">
        <Container className="py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <PencilLine size={18} />
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
            onChange={requestToggle}
            label="Privacy Mode"
            sublabel={
              privacyMode
                ? "All reflection runs locally in your browser."
                : "Enhanced reflection uses an LLM (with a disclosure)."
            }
          />
        </Container>

        <Container className="pb-3">
          <nav className="flex gap-2">
            <Tab to="/journal" icon={<NotebookPen size={16} />}>
              Journal
            </Tab>
            <Tab to="/session" icon={<Sparkles size={16} />}>
              Guided Session
            </Tab>
            <Tab to="/insights" icon={<BarChart3 size={16} />}>
              Insights
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
