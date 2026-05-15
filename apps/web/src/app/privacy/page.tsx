import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Polityka prywatności',
  description: 'Polityka prywatności Leaxaro',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Polityka prywatności</h1>
          <p className="text-sm text-muted-foreground mt-2">Ostatnia aktualizacja: 1 stycznia 2025 · Wersja 1.0</p>
        </div>

        <Section title="1. Administrator danych">
          <p>Administratorem Twoich danych osobowych jest Leaxaro (kontakt: <a href="mailto:privacy@leaxaro.app" className="text-primary hover:underline">privacy@leaxaro.app</a>).</p>
        </Section>

        <Section title="2. Jakie dane zbieramy">
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Dane konta:</strong> imię, adres email, hasło (zaszyfrowane bcrypt)</li>
            <li><strong>Dane profilu:</strong> płeć, data urodzenia, wzrost, masa ciała, cel</li>
            <li><strong>Dane treningowe:</strong> synchronizowane z TrainingPeaks za Twoją zgodą</li>
            <li><strong>Dane analityczne:</strong> anonimowe zdarzenia użytkowania (opcjonalne)</li>
            <li><strong>Logi techniczne:</strong> adres IP (haszowany po 24h), user-agent</li>
          </ul>
        </Section>

        <Section title="3. Cel i podstawa przetwarzania">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Świadczenie usługi coachingu żywieniowego (umowa)</li>
            <li>Personalizacja rekomendacji AI (zgoda)</li>
            <li>Komunikacja e-mailowa (zgoda lub uzasadniony interes)</li>
            <li>Bezpieczeństwo i zapobieganie nadużyciom (uzasadniony interes)</li>
          </ul>
        </Section>

        <Section title="4. Udostępnianie danych">
          <p>Nie sprzedajemy Twoich danych. Korzystamy z następujących podprzetwarzających:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>OpenAI</strong> — generowanie rekomendacji AI (dane treningowe bez PII)</li>
            <li><strong>TrainingPeaks</strong> — synchronizacja danych treningowych</li>
            <li><strong>Resend</strong> — wysyłka emaili transakcyjnych</li>
            <li><strong>Sentry</strong> — monitorowanie błędów (opcjonalne)</li>
          </ul>
        </Section>

        <Section title="5. Twoje prawa (RODO)">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Dostęp do danych i ich przenoszalność</li>
            <li>Sprostowanie nieprawidłowych danych</li>
            <li>Usunięcie konta i danych (prawo do bycia zapomnianym)</li>
            <li>Ograniczenie przetwarzania</li>
            <li>Sprzeciw wobec przetwarzania</li>
            <li>Wycofanie zgody w dowolnym momencie</li>
          </ul>
          <p className="mt-2">Aby skorzystać z praw, skontaktuj się: <a href="mailto:privacy@leaxaro.app" className="text-primary hover:underline">privacy@leaxaro.app</a></p>
        </Section>

        <Section title="6. Przechowywanie danych">
          <p>Dane konta przechowujemy przez czas trwania umowy + 3 lata. Logi techniczne — 90 dni. Po usunięciu konta dane są usuwane w ciągu 30 dni (z wyjątkiem danych wymaganych prawem).</p>
        </Section>

        <Section title="7. Bezpieczeństwo">
          <p>Stosujemy szyfrowanie TLS w transporcie, bcrypt dla haseł, AES-256-GCM dla tokenów integracji oraz kontrolę dostępu opartą na rolach.</p>
        </Section>

        <Section title="8. Pliki cookie">
          <p>Używamy wyłącznie technicznie niezbędnych plików cookie (sesja, CSRF). Nie używamy plików cookie śledzących ani reklamowych.</p>
        </Section>

        <div className="pt-4 border-t border-border">
          <a href="/terms" className="text-sm text-primary hover:underline mr-4">Regulamin</a>
          <a href="/health-disclaimer" className="text-sm text-primary hover:underline">Zastrzeżenia zdrowotne</a>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </div>
  )
}
