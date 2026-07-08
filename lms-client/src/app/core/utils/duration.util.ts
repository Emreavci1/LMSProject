// Süre gösterimi için ortak yardımcılar.
//
// KURAL (proje sahibi, 2026-07-07 — netleşmiş hali):
// - Tek tek ders süreleri GİRİLDİĞİ gibi gösterilir (yuvarlama YOK): 25 dk → "25 dk".
// - YALNIZCA kursun TOPLAM takribi süresi yuvarlanır: toplam dakika en yakın saate
//   yuvarlanıp saat olarak gösterilir (98 dk → "2 saat").
// - Öğrenme/tamamlanma gibi diğer toplamlar gerçek dakikayı toplar (yuvarlanmaz).

// Derslerin GERÇEK süre toplamı (dakika) — yuvarlama yok
export function sumLessonMinutes(lessons: { durationMin: number }[]): number {
  return lessons.reduce((sum, l) => sum + (l.durationMin || 0), 0);
}

// Kursun TOPLAM takribi süresi: toplam dakikayı en yakın saate yuvarlayıp "X saat" döner.
// (98 dk → "2 saat", 50 dk → "1 saat"). İçerik varsa en az "1 saat" gösterilir.
// Bu yalnızca kursun toplamı içindir; tek tek derslerde KULLANMA.
export function formatCourseHours(totalMinutes: number | null | undefined): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 saat';
  const hours = Math.max(1, Math.round(totalMinutes / 60));
  return `${hours} saat`;
}

// Gerçek süreyi okunur metne çevir (öğrenme süresi gibi yerlerde): "25 dk", "1 saat 38 dk"
export function formatDuration(min: number | null | undefined): string {
  if (!min || min <= 0) return '0 dk';
  const hours = Math.floor(min / 60);
  const mins = min % 60;
  if (hours === 0) return `${mins} dk`;
  if (mins === 0) return `${hours} saat`;
  return `${hours} saat ${mins} dk`;
}
