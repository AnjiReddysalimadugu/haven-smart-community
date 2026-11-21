/**
 * Haven premium — restrained SaaS tokens (aligned with Section M).
 * Midnight ink + emerald accent. Soft surfaces, quiet shadows, calm density.
 */
export const colors = {
  ink: '#101828',
  inkSoft: '#1D2939',
  navySurface: '#344054',
  lime: '#176B55',
  limeDeep: '#0E4F3E',
  brand: '#176B55',
  brandDeep: '#0E4F3E',
  brandSoft: '#E7F5F0',
  mist: '#F7F8FA',
  paper: '#FFFFFF',
  chalk: '#FFFFFF',
  text: '#101828',
  muted: '#667085',
  soft: '#98A2B3',
  accent: '#176B55',
  champagne: '#B79B6C',
  champagneSoft: '#F7F2EA',
  danger: '#D92D20',
  success: '#079455',
  warning: '#DC6803',
  border: 'rgba(16,24,40,0.08)',
  borderStrong: 'rgba(16,24,40,0.14)',
  onInk: '#F8FAFC',
  onInkMuted: 'rgba(248,250,252,0.68)',
  gateAccent: '#32B896',
  glass: '#FFFFFF',
  glassStrong: '#FFFFFF',
  glassDark: '#101828',
  glassStroke: 'rgba(16,24,40,0.08)',
  glassStrokeDark: 'rgba(255,255,255,0.1)',
  fab: '#176B55',
  secondaryFill: '#EEF2F6',
  secondaryText: '#101828',
}

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  sans: 'DMSans_400Regular',
  sansMed: 'DMSans_500Medium',
  sansBold: 'DMSans_700Bold',
}

export const space = { xs: 8, sm: 12, md: 16, lg: 20, xl: 28, xxl: 36 }
/** Slightly tighter than prior “expressive” radii — more product, less toy. */
export const radius = { sm: 12, md: 16, lg: 20, xl: 28, full: 999 }

/**
 * Premium dock — edge-to-edge, hairline top, minimal shadow.
 * (Replaces floating pill island that felt generic.)
 */
/** Glass dock — light frosted bar; Bounce active icons lift above it. */
export const glassTabBar = {
  light: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderTopColor: 'rgba(16,24,40,0.06)',
    height: 72,
    paddingBottom: 12,
    paddingTop: 14,
    position: 'absolute' as const,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 28,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(16,24,40,0.08)',
    elevation: 8,
    shadowColor: '#101828',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  dark: {
    backgroundColor: 'rgba(16,24,40,0.92)',
    borderTopColor: 'rgba(255,255,255,0.08)',
    height: 72,
    paddingBottom: 12,
    paddingTop: 14,
    position: 'absolute' as const,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 28,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
}

export const shadow = {
  card: {
    shadowColor: '#101828',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sheet: {
    shadowColor: '#101828',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
}
