# LMS (Learning Management System) — Proje Spesifikasyonu

Bu doküman, bir yazılım geliştirme agent'ının projeyi baştan sona anlaması ve geliştirmesi için hazırlanmıştır. Geliştirmeye başlamadan önce bu dokümanın tamamını oku.

---

## 1. Proje Tanımı ve Amaç

LÖSEV için bir **Eğitim Yönetim Sistemi (LMS)** geliştiriyoruz. Sistem, kurum içi eğitmenlerin (Instructor) eğitim/kurs oluşturduğu, katılımcıların (CourseAttendee) bu kurslara katıldığı **kapalı bir kurumsal sistemdir**. Halka açık bir platform değildir — dışarıdan kimse kendi hesabını oluşturamaz.

### LMS Nedir? (Sistem Mantığı)

LMS, bir kurumun eğitim süreçlerini dijital ortamda yönetmesini sağlayan sistemdir. Temel akış şöyledir:

1. **Admin**, sisteme kullanıcıları ekler ve rollerini atar
2. **Instructor** (eğitmen), sisteme giriş yapıp kurs oluşturur, kursuna içerik/duyuru ekler
3. **CourseAttendee** (katılımcı), açılan kursları görür ve katılır (enrollment)
4. Katılımcılar kurs içeriğini takip eder; sistem kimin neye katıldığını ve ilerlemesini kaydeder
5. Eğitimler periyodik/tekrarlanabilir yapıda olabilir (örn. yıllık zorunlu eğitimler) — bu detay ileride netleşecek

### Proje Sahibi Hakkında Önemli Not

Proje sahibi hem .NET hem Angular öğrenme aşamasındadır. Bu nedenle:
- **Adım adım ilerle, tek seferde dev bir sistem kurma**
- Her adımda ne yaptığını ve neden yaptığını kısaca açıkla
- Aşırı mühendislikten (over-engineering) kaçın, basit ve okunabilir kod yaz
- Her önemli adımdan sonra dur, özet ver, onay al, sonra devam et

---

## 2. Teknoloji Stack (Zorunlu)

| Katman | Teknoloji | Notlar |
|---|---|---|
| Backend | **ASP.NET Core Web API (.NET 10)** | C#, RESTful API |
| ORM | **Entity Framework Core** | Code-First yaklaşım, Migrations kullanılacak |
| Veritabanı | **MSSQL (SQL Server)** | Geliştirmede LocalDB kullanılabilir, connection string appsettings.json'da tutulacak |
| Frontend | **Angular** (güncel LTS sürüm) | Standalone components, TypeScript |
| UI Kütüphanesi | Angular Material veya PrimeNG | Ücretsiz olanlardan biri; responsive component'ler için |
| Authentication | ASP.NET Core Identity + **JWT** | Token bazlı kimlik doğrulama |
| API Dokümantasyonu | Swagger / OpenAPI | Geliştirme ortamında aktif |
| Mapping | AutoMapper | Entity ↔ DTO dönüşümleri |
| Validation | FluentValidation | İstek doğrulama |

---

## 3. Mimari — Katmanlı Yapı (Zorunlu)

Backend, aşağıdaki katmanlı mimariyle ayrı projeler halinde yapılandırılmıştır (solution: `LMS.sln`):

```
LMS.Api          → Controllers, Program.cs, middleware, JWT konfigürasyonu
LMS.Business     → İş mantığı (Service katmanı: Interface + Implementation)
LMS.DataAccess   → EF Core DbContext, Repository Pattern, Migrations
LMS.Entities     → Veritabanı tablolarına karşılık gelen entity sınıfları
LMS.DTO          → API'nin dışa açtığı veri transfer nesneleri
```

**Referans yönü:** `Api → Business`, `Business → DataAccess + DTO`, `DataAccess → Entities`

**Kurallar:**
- Controller'lar iş mantığı içermez; sadece isteği alır, Service'e devreder, sonucu döner
- Entity'ler asla doğrudan API'den dışarı dönülmez — her zaman DTO kullanılır (örn. `PasswordHash` asla client'a gitmemeli)
- Veritabanı erişimi yalnızca Repository üzerinden yapılır; Service katmanı DbContext'e doğrudan dokunmaz
- Dependency Injection kullanılır (constructor injection)

Frontend (Angular) ayrı bir klasörde tutulur (örn. `lms-client/`):

```
src/app/
├── core/
│   ├── services/        → API çağrıları (auth.service, course.service vb.)
│   ├── guards/          → authGuard, roleGuard (rol bazlı sayfa erişimi)
│   ├── interceptors/    → JWT token'ı her isteğe otomatik ekleyen interceptor
│   └── models/          → TypeScript interface'leri (DTO karşılıkları)
├── features/
│   ├── auth/            → login sayfası
│   ├── courses/         → kurs listesi, detay, oluşturma
│   ├── admin/           → kullanıcı yönetimi (Admin paneli)
│   └── dashboard/       → role göre farklı dashboard
└── shared/
    └── components/      → navbar, loading, ortak UI bileşenleri
```

---

## 4. Roller ve Yetki Yapısı (Permission Sistemi — ZORUNLU)

Sistemde 3 rol vardır. Yetkilendirme **hem backend'de hem frontend'de** uygulanmak zorundadır.

### Roller ve Yetkileri

**Admin**
- Kullanıcı oluşturur, düzenler, siler, rol atar (kapalı sistem olduğu için kullanıcıları yalnızca Admin ekler)
- Tüm kursları görür ve yönetir (Instructor kısıtlaması olmadan)
- Sistem geneli istatistikleri görür

**Instructor (Eğitmen)**
- Kendi kursunu oluşturur, düzenler, siler
- **Yalnızca kendi kurslarını** yönetebilir — başka Instructor'ın kursuna müdahale edemez (bu kontrol backend'de service katmanında yapılmalı: kaynak sahipliği kontrolü / resource ownership check)
- Kursuna katılan katılımcıları görür

**CourseAttendee (Katılımcı)**
- Açık kursları listeler, detayını görür
- Kurslara katılır (enrollment)
- Yalnızca kendi katılımlarını ve kendi verilerini görür

### Backend Yetkilendirme Kuralları

- JWT token içinde kullanıcının rolü claim olarak taşınır
- Her endpoint `[Authorize]` ile korunur; role özel endpoint'lerde `[Authorize(Roles = "...")]` kullanılır
- Rol kontrolü tek başına yeterli değildir: **kaynak sahipliği kontrolü** de yapılmalıdır. Örnek: Bir Instructor, `PUT /api/courses/5` çağırdığında, service katmanı o kursun gerçekten bu Instructor'a ait olup olmadığını doğrulamalıdır. Değilse 403 Forbidden dönülür.
- Login olmayan kullanıcı hiçbir korumalı endpoint'e erişemez (401 Unauthorized)

### Frontend Yetkilendirme Kuralları

- Route Guard'lar ile rol bazlı sayfa erişimi (`canActivate`): örn. `/admin` yalnızca Admin, `/course-create` yalnızca Instructor
- Menü ve butonlar role göre gösterilir/gizlenir (örn. CourseAttendee "Kurs Oluştur" butonunu hiç görmez)
- **Önemli:** Frontend kontrolleri yalnızca kullanıcı deneyimi içindir; gerçek güvenlik her zaman backend'dedir. Frontend'de gizlemek yeterli değildir, backend her istekte yetkiyi tekrar doğrular.

### Kayıt / Giriş Akışı

- **Self-registration YOKTUR.** Kayıt sayfası yapılmayacak.
- Kullanıcıları yalnızca Admin oluşturur (Admin panelinden).
- Kullanıcılar `POST /api/auth/login` ile email + şifre girerek giriş yapar, JWT token alır.
- Şifreler asla düz metin saklanmaz — ASP.NET Core Identity'nin hash mekanizması kullanılır.
- İlk Admin kullanıcısı, veritabanı seed işlemiyle (migration/seed data) oluşturulur.

---

## 5. Veri Modeli (Başlangıç)

Aşağıdaki entity'lerle başla. İleride genişletilecek, şimdilik bunlarla sınırlı kal:

```
User
├── Id (int, PK)
├── FullName (string)
├── Email (string, unique)
├── PasswordHash (string)
├── Role (enum: CourseAttendee, Instructor, Admin)
├── IsActive (bool, default true)      → soft delete/pasifleştirme için
└── CreatedDate (DateTime, UTC)

Course
├── Id (int, PK)
├── Title (string)
├── Description (string)
├── InstructorId (int, FK → User)
├── Instructor (navigation property)
├── IsActive (bool, default true)
└── CreatedDate (DateTime, UTC)

Enrollment
├── Id (int, PK)
├── UserId (int, FK → User)
├── CourseId (int, FK → Course)
├── EnrollDate (DateTime, UTC)
└── Unique constraint: (UserId, CourseId)   → aynı kişi aynı kursa iki kez kayıt olamaz
```

### Henüz Netleşmemiş — Şimdilik YAPMA

Aşağıdaki konular henüz karara bağlanmadı. Bunlar için altyapı kurma, tablo ekleme, varsayımda bulunma. Netleştiğinde doküman güncellenecek:

- Section/şube sistemi (bir dersi birden fazla Instructor'ın vermesi)
- Ders içerik yapısı (video, doküman, quiz vb.) — **PLAN NETLEŞTİ (2026-07-06), uygulama ertelendi:**
  video ve sunumlar URL olarak değil, Udemy/Moodle tarzı doğrudan dosya yükleme ile sisteme
  yüklenecek (dosya depolama + Lesson entity + upload API gerektirir). Büyük iş olduğu için
  şimdilik yapılmıyor; geçici çözüm olarak dersler frontend'de localStorage'da tutuluyor
  (`MockDataService.managedLessons`). Bu madde uygulanana kadar backend'e ders tablosu ekleme.
- Sertifika sistemi
- Periyodik eğitim mekanizması (yıllık tekrar, hatırlatma vb.)
- İlerleme (progress) ölçümü
- Duyuru (announcements) modülü

---

## 6. API Endpoint Planı (Başlangıç)

```
AuthController
  POST   /api/auth/login              → JWT token döner (herkese açık tek endpoint)

UserController (yalnızca Admin)
  GET    /api/users                   → kullanıcıları listele
  POST   /api/users                   → yeni kullanıcı oluştur (rol ataması dahil)
  PUT    /api/users/{id}              → kullanıcı güncelle
  DELETE /api/users/{id}              → kullanıcıyı pasifleştir (soft delete, IsActive=false)

CourseController
  GET    /api/courses                 → aktif kursları listele (tüm giriş yapmış kullanıcılar)
  GET    /api/courses/{id}            → kurs detayı (tüm giriş yapmış kullanıcılar)
  POST   /api/courses                 → kurs oluştur (Instructor, Admin)
  PUT    /api/courses/{id}            → kurs güncelle (yalnızca kursun sahibi Instructor veya Admin)
  DELETE /api/courses/{id}            → kurs pasifleştir (yalnızca kursun sahibi Instructor veya Admin)
  GET    /api/courses/my              → Instructor'ın kendi kursları

EnrollmentController
  POST   /api/enrollments             → kursa katıl (CourseAttendee)
  GET    /api/enrollments/my          → kullanıcının katıldığı kurslar
  GET    /api/enrollments/course/{courseId} → kursa katılanlar (kursun sahibi Instructor veya Admin)
```

Tüm endpoint'ler (login hariç) `[Authorize]` gerektirir. HTTP durum kodları doğru kullanılmalı: 200/201 başarı, 400 validasyon hatası, 401 kimliksiz, 403 yetkisiz, 404 bulunamadı.

---

## 7. Frontend Gereksinimleri

### Responsive Tasarım (ZORUNLU)

- Tüm sayfalar **mobil, tablet ve masaüstünde** düzgün çalışmalıdır
- Mobile-first yaklaşım tercih edilir; CSS Grid/Flexbox kullanılır
- Angular Material veya PrimeNG'nin responsive component'lerinden (grid, breakpoint sistemleri) yararlanılır
- Navbar mobilde hamburger menüye dönüşmeli, tablolar mobilde yatay taşma yapmamalı (kart görünümüne dönüşebilir veya yatay scroll kontrollü olmalı)

### Sayfalar (Başlangıç Kapsamı)

1. **Login** — email + şifre, hata mesajları kullanıcı dostu
2. **Dashboard** — role göre farklı içerik (Admin: sistem özeti; Instructor: kendi kursları; CourseAttendee: katıldığı kurslar)
3. **Kurs Listesi** — aktif kurslar, arama/filtreleme
4. **Kurs Detay** — kurs bilgisi; CourseAttendee için "Katıl" butonu, katılmışsa "Katıldın" durumu
5. **Kurs Oluştur/Düzenle** — yalnızca Instructor (form validasyonlu)
6. **Admin Paneli — Kullanıcı Yönetimi** — kullanıcı listesi, ekleme, düzenleme, pasifleştirme, rol atama

### Genel Frontend Kuralları

- JWT token, login sonrası saklanır ve HTTP interceptor ile her isteğe `Authorization: Bearer <token>` olarak eklenir
- Token süresi dolduğunda kullanıcı login'e yönlendirilir
- API hataları kullanıcıya anlaşılır mesajlarla gösterilir (toast/snackbar)
- Loading durumları gösterilir (spinner/skeleton)
- Form validasyonları hem anlık (client-side) hem submit sırasında yapılır

---

## 8. Geliştirme Sırası (Fazlar)

Bu sırayla ilerle; her fazın sonunda dur, yapılanları özetle, onay al:

### Faz 1 — Backend Temeli
1. Entity'leri oluştur (User, Course, Enrollment)
2. DbContext + MSSQL bağlantısı (connection string: appsettings.json)
3. İlk migration + veritabanı oluşturma + seed Admin kullanıcısı
4. JWT authentication + login endpoint'i
5. Swagger ile test

### Faz 2 — Backend API
1. UserController (Admin işlemleri)
2. CourseController (sahiplik kontrolü dahil)
3. EnrollmentController
4. FluentValidation ile istek doğrulamaları

### Faz 3 — Frontend Temeli
1. Angular projesi + routing + Material/PrimeNG kurulumu
2. Login sayfası + auth service + interceptor + guards
3. Role göre dashboard iskeleti

### Faz 4 — Frontend Özellikler
1. Kurs listesi + detay + katılma akışı
2. Instructor kurs oluşturma/düzenleme
3. Admin kullanıcı yönetim paneli
4. Responsive iyileştirmeler ve genel cilalama

---

## 9. Genel Çalışma Kuralları (Agent İçin)

1. Her adımda ne yapacağını 1-2 cümleyle açıkla, sonra yap
2. Her fazın sonunda dur: yapılanları özetle, sonraki adımı öner, onay bekle
3. "Henüz Netleşmemiş" listesindeki konular için kod yazma, tablo oluşturma, varsayım yapma
4. Kod açıklamalarını Türkçe yorum satırlarıyla destekle (proje sahibi öğreniyor)
5. Güvenlik kurallarından (yetkilendirme, şifre hash, DTO kullanımı) hiçbir koşulda taviz verme
6. Basitlik > zeka gösterisi: okunabilir, anlaşılır kod yaz
