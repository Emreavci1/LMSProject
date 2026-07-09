import { API_URL } from '../api.config';

// Backend'in kökü (http://localhost:5091) — /uploads/... yolları buradan sunulur
const API_ORIGIN = API_URL.replace(/\/api$/, '');

// Sunucudaki göreli dosya yolunu (/uploads/...) tarayıcının açabileceği
// tam adrese çevirir. Zaten tam URL ise (http...) dokunmaz.
export function fileUrl(path: string | null | undefined): string {
  if (!path) return '';
  return path.startsWith('/') ? API_ORIGIN + path : path;
}

// Bu ContentUrl bizim sunucuya yüklenmiş bir dosya mı? (harici link değil)
export function isUploadedFile(path: string | null | undefined): boolean {
  return !!path && path.startsWith('/uploads/');
}
