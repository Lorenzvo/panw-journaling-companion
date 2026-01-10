import { Card } from "../components/Card";

export function JournalPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Journal</h1>
        <p className="text-slate-600">
          No pressure. Write messy. Start anywhere.
        </p>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">
          “Where do I start?” prompts
        </div>
        <p className="mt-1 text-sm text-slate-600">
          We’ll add quick-start chips and a stream-of-consciousness entry box next.
        </p>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold text-slate-900">Today’s entry</div>
        <p className="mt-1 text-sm text-slate-600">
          Entry editor will go here.
        </p>
      </Card>
    </div>
  );
}
