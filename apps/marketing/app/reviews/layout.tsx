import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Google Reviews Analysis for Restaurants | AI-Powered Insights | PeakOps',
  description: 'Get instant, free AI analysis of your restaurant\'s Google reviews. Discover what customers really think, identify top issues, and get actionable micro-checks to improve operations. No credit card required.',
  keywords: 'google reviews analysis, restaurant review analysis, customer feedback analysis, AI review insights, restaurant operations, hospitality management, review sentiment analysis, customer experience improvement',
  openGraph: {
    title: 'Free Google Reviews Analysis - Turn Feedback into Action',
    description: 'Instantly analyze your restaurant\'s Google reviews with AI. Get top issues, sentiment trends, and recommended daily micro-checks - 100% free.',
    type: 'website',
    url: 'https://getpeakops.com/reviews',
    images: [
      {
        url: '/og-reviews.png',
        width: 1200,
        height: 630,
        alt: 'PeakOps Free Google Reviews Analysis'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Google Reviews Analysis for Restaurants',
    description: 'AI-powered analysis of your Google reviews. Get actionable insights in 60 seconds - no credit card required.',
    images: ['/og-reviews.png']
  },
  alternates: {
    canonical: 'https://getpeakops.com/reviews'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};

export default function ReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
