import ChatbotWidget from '../../features/chatbot/ChatbotWidget';

export default function ChatbotPage() {
  return (
    <div className="mx-auto w-full max-w-[980px] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-vscode-editor-fg">Chatbot</h1>
          <p className="text-sm text-vscode-foreground/70">
            A calm, guided assistant that explains forecasts only when you ask — and generates realistic plans.
          </p>
        </div>

        <span
          className="shrink-0 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs
                     border border-vscode-widget-border bg-vscode-input-bg text-vscode-editor-fg"
        >
          Guided • Calm
        </span>
      </div>

      <ChatbotWidget />
    </div>
  );
}
