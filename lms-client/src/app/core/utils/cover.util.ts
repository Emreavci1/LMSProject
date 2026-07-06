// Kapak değeri gradient ise doğrudan, görsel (dataURL/URL) ise url() ile sarmalanır.
// Böylece [style.background-image] hem gradient hem görselde çalışır.
// Değer boşsa varsayılan bir gradient döner.
export function coverCss(cover?: string | null): string {
  const fallback = 'linear-gradient(135deg, #0284C7, #7C3AED)';
  const value = cover && cover.trim() ? cover : fallback;
  const isGradient =
    value.startsWith('linear-gradient') || value.startsWith('radial-gradient');
  if (isGradient || value.startsWith('url(')) return value;
  return `url('${value}')`;
}
