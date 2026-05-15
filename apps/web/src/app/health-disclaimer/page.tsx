import type { Metadata } from 'next'
import { AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Zastrzeżenia zdrowotne',
  description: 'Ważne informacje o charakterze zdrowotnym aplikacji Leaxaro',
}

export default function HealthDisclaimerPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zastrzeżenia zdrowotne</h1>
          <p className="text-sm text-muted-foreground mt-2">Prosimy o uważne zapoznanie się z poniższymi informacjami.</p>
        </div>

        {/* Important notice */}
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-5">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"/>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Leaxaro nie jest aplikacją medyczną</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">Rekomendacje żywieniowe generowane przez AI są wyłącznie materiałem informacyjnym i nie stanowią porady medycznej ani dietetycznej.</p>
          </div>
        </div>

        <Section title="Cel aplikacji">
          <p>Leaxaro jest narzędziem wspierającym świadomość żywieniową sportowców amatorów. Aplikacja dostarcza spersonalizowanych wskazówek żywieniowych opartych na danych treningowych i ogólnie przyjętych zasadach żywienia sportowego.</p>
        </Section>

        <Section title="Nie zastępuje porady lekarskiej">
          <p>Rekomendacje aplikacji <strong>nie zastępują</strong>:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Konsultacji z lekarzem lub specjalistą medycyny sportowej</li>
            <li>Diagnozy medycznej lub planu leczenia</li>
            <li>Indywidualnej porady dietetyka lub żywieniowca</li>
            <li>Planu treningowego opracowanego przez certyfikowanego trenera</li>
          </ul>
        </Section>

        <Section title="Przed rozpoczęciem">
          <p>Zalecamy konsultację z lekarzem przed wprowadzeniem istotnych zmian w diecie, szczególnie jeśli:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Cierpisz na jakąkolwiek chorobę przewlekłą</li>
            <li>Stosujesz leki wymagające szczególnej diety</li>
            <li>Masz historię zaburzeń odżywiania</li>
            <li>Jesteś w ciąży lub karmisz piersią</li>
            <li>Dopiero zaczynasz intensywny trening</li>
          </ul>
        </Section>

        <Section title="Ograniczenia AI">
          <p>Rekomendacje generowane przez sztuczną inteligencję:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Opierają się na ogólnych danych, nie na Twoim pełnym stanie zdrowia</li>
            <li>Mogą nie uwzględniać indywidualnych nietolerancji, alergii lub schorzeń</li>
            <li>Są przybliżone i mogą zawierać błędy</li>
            <li>Nie uwzględniają interakcji z lekami</li>
          </ul>
        </Section>

        <Section title="Twoja odpowiedzialność">
          <p>Korzystając z Leaxaro, potwierdzasz, że:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Rozumiesz informacyjny charakter rekomendacji</li>
            <li>Będziesz stosować rekomendacje z własnym osądem</li>
            <li>W razie wątpliwości skonsultujesz się ze specjalistą</li>
            <li>Leaxaro nie ponosi odpowiedzialności za efekty stosowania się do rekomendacji</li>
          </ul>
        </Section>

        <div className="pt-4 border-t border-border">
          <a href="/terms" className="text-sm text-primary hover:underline mr-4">Regulamin</a>
          <a href="/privacy" className="text-sm text-primary hover:underline">Polityka prywatności</a>
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
