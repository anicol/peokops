/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Customize image domains if needed
  images: {
    domains: ['images.pexels.com', 'getpeakops.com'],
    unoptimized: true, // Required for static export if needed later
  },

  // Redirects for route aliases
  async redirects() {
    return [
      {
        source: '/coaching',
        destination: '/coaching-mode',
        permanent: true,
      },
      {
        source: '/roi',
        destination: '/roi-calculator',
        permanent: true,
      },
    ]
  },

  // Preserve existing port for dev
  // Note: Use -p flag in dev script instead
}

export default nextConfig
