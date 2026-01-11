import { useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { JournalPage } from "./pages/JournalPage";
import { InsightsPage } from "./pages/InsightsPage";
import { GuidedSessionPage } from "./pages/GuidedSessionPage";

export default function App() {
  const [privacyMode, setPrivacyMode] = useState(true);

  const shellProps = useMemo(
    () => ({ privacyMode, setPrivacyMode }),
    [privacyMode]
  );

  return (
    <AppShell {...shellProps}>
      <Routes>
        <Route path="/" element={<Navigate to="/journal" replace />} />
        <Route path="/journal" element={<JournalPage privacyMode={privacyMode} />} />
        <Route path="/session" element={<GuidedSessionPage privacyMode={privacyMode} />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/reflection" element={<Navigate to="/insights" replace />} />
      </Routes>
    </AppShell>
  );
}
