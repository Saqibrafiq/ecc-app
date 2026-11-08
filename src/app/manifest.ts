import type { MetadataRoute } from 'next'

const NAVY = '#121d44'

/** Makes the app installable: Home Screen icon, own window, club colours (ADR-0001). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ECC App · Erlangen Cricket Club',
    short_name: 'ECC',
    description: 'Match and practice availability, attendance and squad selection for ECC members.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: NAVY,
    theme_color: NAVY,
    lang: 'en',
    categories: ['sports'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
