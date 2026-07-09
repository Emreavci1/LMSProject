# LÖSEV LMS — Eğitim Yönetim Sistemi

LÖSEV için geliştirilen **kapalı kurumsal eğitim yönetim sistemi** (Learning Management System).
Kurum içi eğitmenler eğitim/kurs oluşturur, katılımcılar bu eğitimlere katılır ve ilerlemeleri takip edilir.
Halka açık bir platform değildir — kullanıcıları yalnızca Admin ekler, dışarıdan kayıt olunamaz.

> Ayrıntılı teknik şartname için: [CLAUDE.md](CLAUDE.md) · Geliştirme rehberi için: [PROJE-REHBERI.md](PROJE-REHBERI.md)

---

## Özellikler (Mevcut Durum)

- 🔐 **JWT ile giriş** — self-registration yok, kullanıcıları Admin oluşturur
- 👥 **3 rol**: Admin, Instructor (eğitmen), CourseAttendee (katılımcı) — hem backend hem frontend'de yetki kontrolü
- 📚 **Kurs yönetimi** — eğitmen kendi kurslarını oluşturur/düzenler; kaynak sahipliği kontrolü backend'de
- 📖 **Ders modülü** — 5 içerik tipi: URL bağlantısı (YouTube gömme destekli), okuma metni, fotoğraf, sunum/PDF, video
- 📤 **Dosya yükleme** — foto (5MB) / sunum-PDF (25MB) / video (300MB), uzantı beyaz listesi, sunucuda `wwwroot/uploads` altında
- ✅ **İlerleme takibi** — ders tamamlama işaretleme, kurs bazında yüzde; eğitmen katılımcıların gerçek ilerlemesini görür
- 🧑‍💼 **Admin paneli** — kullanıcı yönetimi (ekleme/rol atama/pasifleştirme) ve tüm eğitimlerin yönetimi (aktif/pasif dahil)
- 📱 **Responsive tasarım** — mobil/tablet/masaüstü

## Teknoloji Stack

| Katman | Teknoloji |
|---|---|
| Backend | ASP.NET Core Web API (.NET 10), C# |
| ORM | Entity Framework Core (Code-First + Migrations) |
| Veritabanı | MSSQL (SQL Server) |
| Frontend | Angular (standalone components, signals) + Angular Material |
| Kimlik Doğrulama | JWT (token bazlı) |
| Diğer | AutoMapper, FluentValidation, Swagger |

## Mimari

Katmanlı mimari — her katman ayrı proje:

```
LMS.Api          → Controllers, Program.cs, JWT konfigürasyonu
LMS.Business     → İş mantığı (Service katmanı) + validasyon
LMS.DataAccess   → EF Core DbContext, Repository Pattern, Migrations
LMS.Entities     → Veritabanı entity sınıfları
LMS.DTO          → API'nin dışa açtığı veri transfer nesneleri
lms-client/      → Angular frontend
```

Referans yönü: `Api → Business → DataAccess → Entities`. Entity'ler asla doğrudan dışarı dönülmez, her zaman DTO kullanılır.

## Kurulum ve Çalıştırma

### Gereksinimler
- .NET 10 SDK
- Node.js (LTS) + npm
- SQL Server (geliştirmede LocalDB yeterli)

### Backend
```bash
dotnet run --project LMS.Api --launch-profile http
# → http://localhost:5091  (Swagger: /swagger)
```
İlk çalıştırmada migration'lar otomatik uygulanır ve test kullanıcıları seed edilir.
Connection string: `LMS.Api/appsettings.json`

### Frontend
```bash
cd lms-client
npm install
npm start
# → http://localhost:4200
```

### Test Kullanıcıları (seed — yalnızca geliştirme)
| Rol | E-posta | Şifre |
|---|---|---|
| Admin | admin@losev.org.tr | Admin123! |
| Eğitmen | egitmen1@losev.org.tr | Egitmen123! |
| Katılımcı | katilimci1@losev.org.tr | Katilimci123! |

## Proje Yönetimi (Agile / Scrum)

Proje Scrum pratikleriyle yürütülür: iş kalemleri **Product Backlog**'da tutulur,
**sprint**'ler halinde geliştirilir, her günün sonunda kısa durum değerlendirmesi (daily) yapılır.

### Definition of Done (bir iş ne zaman "bitti" sayılır)
- [ ] Kod hem backend hem frontend'de derleniyor
- [ ] Yetki kuralları uygulanmış (backend `[Authorize]` + sahiplik kontrolü, frontend guard/gizleme)
- [ ] Uçtan uca elle test edildi (ilgili akış gerçek uygulamada çalıştırıldı)
- [ ] CLAUDE.md / dokümantasyon güncellendi

### Tamamlanan İşler (Done)
- ✅ Katmanlı backend + JWT auth + seed Admin
- ✅ Kullanıcı / Kurs / Katılım (enrollment) API'leri, sahiplik kontrolleri
- ✅ Angular temel yapı: login, interceptor, guard'lar, role göre dashboard
- ✅ Ders modülü (5 içerik tipi) + ders oynatıcı (player)
- ✅ İlerleme takibi (LessonCompletions) + eğitmen katılımcı listesi
- ✅ Dosya yükleme altyapısı (upload API + statik sunum + form entegrasyonu)
- ✅ Admin eğitim yönetimi gerçek veriye bağlandı (pasif/taslak dahil listeleme, durum toggle, detay)

### Product Backlog (Sıradaki İşler)
- 🔜 Admin panelinin kalan mock sayfaları (Kategoriler, Genel Bakış) → gerçek veriye bağlanacak
- 🔜 Duyuru (announcements) modülü — şimdilik ertelendi
- 🔜 Sertifika sistemi
- 🔜 Periyodik eğitim mekanizması (yıllık zorunlu eğitim, hatırlatma)
- 🔜 Section/şube sistemi (bir dersi birden fazla eğitmenin vermesi)
- 🔜 Canlı ortam hazırlığı (korumalı dosya sunumu, AutoMapper güvenlik güncellemesi)

## Güvenlik Notları

- Şifreler ASP.NET Core Identity hash mekanizmasıyla saklanır, asla düz metin tutulmaz
- Frontend'deki gizleme/guard'lar yalnızca kullanıcı deneyimi içindir — **gerçek güvenlik backend'dedir**, her istek yeniden doğrulanır
- Yüklenen dosyalar uzantı beyaz listesi + boyut sınırından geçer, GUID adla saklanır (path traversal engeli)
- Bilinen kısıt: statik dosya sunumu (`/uploads/...`) token istemez — kapalı kurum içi ağ için kabul edildi, canlıda korumalı sunum planlanacak
