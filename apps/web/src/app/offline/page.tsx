// Offline page — shown by service worker when network is unavailable
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-5xl">📡</div>
        <h1 className="text-2xl font-bold text-foreground">Brak połączenia</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Leaxaro potrzebuje połączenia z internetem, aby wyświetlić Twoje dane.
          Sprawdź połączenie i spróbuj ponownie.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Odśwież stronę
        </button>
      </div>
    </div>
  )
}
