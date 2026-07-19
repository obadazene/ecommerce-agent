import ChatInterface from "../../components/chat/ChatInterface";

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
        <h1 className="text-3xl font-bold">Agent Chat</h1>
        <ChatInterface />
      </section>
    </main>
  );
}
