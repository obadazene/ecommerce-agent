import Dashboard from "../components/dashboard/Dashboard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
        <h1 className="text-4xl font-bold">E-Commerce Agent</h1>
        <p className="text-lg text-slate-600">
          AI-powered product discovery, monitoring, and reporting.
        </p>
        <Dashboard />
      </section>
    </main>
  );
}
