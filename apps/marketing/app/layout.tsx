import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import Header from '../components/Header'
import Footer from '../components/Footer'
import '../src/index.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://getpeakops.com'),
  title: 'PeakOps - AI Habits for Operational Excellence',
  description: 'Three quick questions a day. One minute. PeakOps helps multi-unit operators build daily habits that drive consistent operational excellence across every location.',
  openGraph: {
    title: 'PeakOps - AI Habits for Operational Excellence',
    description: 'Three quick questions a day. One minute. PeakOps helps multi-unit operators build daily habits that drive consistent operational excellence across every location.',
    url: 'https://getpeakops.com',
    siteName: 'PeakOps',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PeakOps - AI Habits for Operational Excellence',
    description: 'Three quick questions a day. One minute. PeakOps helps multi-unit operators build daily habits that drive consistent operational excellence across every location.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/logo.png" />

        {/* Plausible Analytics */}
        <Script
          defer
          data-domain="getpeakops.com"
          src="https://plausible.io/js/script.hash.outbound-links.pageview-props.tagged-events.js"
        />
        <Script
          id="plausible-init"
          dangerouslySetInnerHTML={{
            __html: `window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`,
          }}
        />

        {/* Google Analytics */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-CNCCZ1FXQ3"
        />
        <Script
          id="google-analytics"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-CNCCZ1FXQ3');
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  )
}
