import { fileUrl } from './file-url.util';

// Hazır (preset) avatar kimlikleri → frontend'deki SVG dosyaları
const PRESETS: Record<string, string> = {
  'preset:male': 'avatars/male.svg',
  'preset:female': 'avatars/female.svg',
  'preset:neutral': 'avatars/neutral.svg',
};

// Kullanıcının avatarUrl değerini <img src> için gerçek adrese çevirir:
//  - null/boş     → varsayılan silüet (neutral)
//  - "preset:..." → paketlenmiş SVG
//  - "/uploads/.." veya MinIO URL'i → yüklenen fotoğraf
export function avatarSrc(avatarUrl?: string | null): string {
  if (!avatarUrl) return PRESETS['preset:neutral'];
  return PRESETS[avatarUrl] ?? fileUrl(avatarUrl);
}
