import { Card } from "../components/Card";

export function InsightsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Insights</h1>
        <p className="text-slate-600">
          Gentle patterns, not judgments.
        </p>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">Mood trend</div>
        <p className="mt-1 text-sm text-slate-600">Chart goes here.</p>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">Themes</div>
        <p className="mt-1 text-sm text-slate-600">Top themes goes here.</p>
      </Card>
    </div>
  );
}
