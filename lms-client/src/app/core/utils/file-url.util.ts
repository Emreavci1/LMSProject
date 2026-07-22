import { API_URL } from '../api.config';

// Backend'in kökü (http://localhost:5091) — /uploads/... yolları buradan sunulur
const API_ORIGIN = API_URL.replace(/\/api$/, '');

// Sunucudaki göreli dosya yolunu (/uploads/...) tarayıcının açabileceği
// tam adrese çevirir. Zaten tam URL ise (http...) dokunmaz.
// MinIO URL'leri özel durum: DB'de hangi makine adıyla (localhost vb.)
// kaydedilmiş olursa olsun, dosya sayfanın açıldığı sunucudan istenir —
// böylece ağdaki başka bilgisayarlardan da görüntülenebilir.
export function fileUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('/')) return API_ORIGIN + path;

  const minio = path.match(/^https?:\/\/[^/:]+(:\d+)?(\/lms-uploads\/.*)$/);
  if (minio) return `http://${window.location.hostname}${minio[1] ?? ''}${minio[2]}`;

  return path;
}

// Bu ContentUrl bizim sunucuya yüklenmiş bir dosya mı? (harici link değil)
// İki depolama biçimi tanınır:
//  - yerel disk: /uploads/... (backend wwwroot)
//  - MinIO: http://host:9000/lms-uploads/... (bucket adı appsettings ile eş)
export function isUploadedFile(path: string | null | undefined): boolean {
  if (!path) return false;
  return path.startsWith('/uploads/') || /^https?:\/\/[^/]+\/lms-uploads\//.test(path);
}
