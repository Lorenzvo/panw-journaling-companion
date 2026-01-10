import { Card } from "../components/Card";

export function ReflectionPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Weekly Reflection</h1>
        <p className="text-slate-600">
          A small recap, plus a kind nudge for next week.
        </p>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">This week in brief</div>
        <p className="mt-1 text-sm text-slate-600">Summary goes here.</p>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">Try next week</div>
        <p className="mt-1 text-sm text-slate-600">Suggestions go here.</p>
      </Card>
    </div>
  );
}
