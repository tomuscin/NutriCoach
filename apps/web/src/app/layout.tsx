import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeColorSync } from '@/components/providers/ThemeColorSync'
import { PWAProvider } from '@/components/providers/PWAProvider'
import { NextAuthProvider } from '@/components/providers/NextAuthProvider'

// Private app — all pages are dynamic (auth-protected, no static generation needed)
export const dynamic = 'force-dynamic'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Leaxaro',
    template: '%s | Leaxaro',
  },
  description: 'AI-native Conversational Intelligence Platform — żywienie, trening, regeneracja',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Leaxaro',
  },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    siteName: 'Leaxaro',
  },
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  // Static fallback — dynamic theme-color is updated client-side by ThemeProvider
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Leaxaro" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* iOS splash screens — generated from manifest colors */}
        <link rel="apple-touch-startup-image" href="/icons/apple-touch-icon.png" />
        <meta name="apple-touch-fullscreen" content="yes" />
        {/* No-flash script: reads localStorage before React hydrates, applies dark class immediately */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('leaxaro-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t==='system'&&d)||(!t&&d)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextAuthProvider>
          <ThemeProvider>
            <ThemeColorSync />
            <PWAProvider>
              {children}
            </PWAProvider>
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
}
