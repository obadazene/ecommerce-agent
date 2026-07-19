export default function Dashboard() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-slate-600">
            Quick overview of product discovery and alerts.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm uppercase text-slate-500">Products monitored</p>
          <p className="mt-3 text-3xl font-bold">128</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm uppercase text-slate-500">New today</p>
          <p className="mt-3 text-3xl font-bold">5</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm uppercase text-slate-500">Average score</p>
          <p className="mt-3 text-3xl font-bold">72%</p>
        </div>
        <div className="rounded-3xl bg-slate-50 p-5">
          <p className="text-sm uppercase text-slate-500">Alerts</p>
          <p className="mt-3 text-3xl font-bold">3</p>
        </div>
      </div>
    </section>
  );
}
