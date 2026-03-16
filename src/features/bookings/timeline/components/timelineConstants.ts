export type ZoomLevel = '3d' | '7d' | '14d'

export const ZOOM_CONFIG: Record<
  ZoomLevel,
  { label: string; cssWidth: string; pxWidth: number }
> = {
  '3d':  { label: '3D',  cssWidth: '16.25rem', pxWidth: 260 },
  '7d':  { label: '7D',  cssWidth: '7.5rem',   pxWidth: 120 },
  '14d': { label: '14D', cssWidth: '4.375rem',  pxWidth: 70 },
}
