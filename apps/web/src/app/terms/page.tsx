import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regulamin',
  description: 'Regulamin korzystania z NutriCoach',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Regulamin</h1>
          <p className="text-sm text-muted-foreground mt-2">Ostatnia aktualizacja: 1 stycznia 2025 · Wersja 1.0</p>
        </div>

        <Section title="1. Akceptacja warunków">
          <p>Korzystając z aplikacji NutriCoach, akceptujesz niniejszy Regulamin. Jeśli nie zgadzasz się z warunkami, zaprzestań korzystania z usługi.</p>
        </Section>

        <Section title="2. Opis usługi">
          <p>NutriCoach jest aplikacją wspierającą coaching żywieniowy dla sportowców. Aplikacja łączy dane treningowe z TrainingPeaks z rekomendacjami żywieniowymi generowanymi przez sztuczną inteligencję.</p>
        </Section>

        <Section title="3. Konto użytkownika">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Rejestracja wymaga podania prawdziwych danych.</li>
            <li>Jesteś odpowiedzialny/a za bezpieczeństwo swojego hasła.</li>
            <li>Każda osoba może posiadać tylko jedno konto.</li>
            <li>Możemy zawiesić konta naruszające Regulamin.</li>
          </ul>
        </Section>

        <Section title="4. Dane zdrowotne">
          <p>Aplikacja przetwarza dane zdrowotne (masa ciała, aktywność fizyczna, dane treningowe) wyłącznie w celu świadczenia usługi. Szczegóły w <a href="/privacy" className="text-primary hover:underline">Polityce prywatności</a>.</p>
        </Section>

        <Section title="5. Ograniczenia odpowiedzialności">
          <p>NutriCoach nie jest aplikacją medyczną. Rekomendacje AI nie zastępują porady lekarza ani dietetyka. Szczegóły w <a href="/health-disclaimer" className="text-primary hover:underline">Zastrzeżeniach zdrowotnych</a>.</p>
        </Section>

        <Section title="6. Własność intelektualna">
          <p>Wszelkie prawa do aplikacji, algorytmów i treści należą do NutriCoach. Treści generowane przez AI są dostarczane wyłącznie na użytek osobisty.</p>
        </Section>

        <Section title="7. Zmiany Regulaminu">
          <p>Zastrzegamy prawo do zmiany Regulaminu. O istotnych zmianach poinformujemy przez email z 30-dniowym wyprzedzeniem.</p>
        </Section>

        <Section title="8. Kontakt">
          <p>Pytania dotyczące Regulaminu: <a href="mailto:support@nutricoach.app" className="text-primary hover:underline">support@nutricoach.app</a></p>
        </Section>

        <div className="pt-4 border-t border-border">
          <a href="/privacy" className="text-sm text-primary hover:underline mr-4">Polityka prywatności</a>
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
