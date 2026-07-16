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

- Section/şube sistemi — **KARAR (2026-07-16): YAPILMAYACAK** (kapsam dışı bırakıldı)
- Ders içerik yapısı (video, doküman, quiz vb.):
  - **YAPILDI (2026-07-07) — Backend ders depolama (URL/metin tabanlı):** `Lesson` entity +
    `Lessons` tablosu + migration + CRUD API (`/api/courses/{courseId}/lessons`, sahiplik
    kontrollü) eklendi. Dersler artık SQL Server'da kalıcı tutulur. İçerik tipi: `Video`/`Document`
    URL ile, `Text` doğrudan metinle.
  - **YAPILDI (2026-07-08) — Dummy/demo veri temizliği:** Ders backend'e taşındığı için artık
    kullanılmayan `MockDataService.managedLessons` (localStorage kalıntısı) ve 3 sahte demo kurs +
    18 sahte ders (Discover/Eğitimlerim/Dashboard/Player'da gerçek kurslarla birleştiriliyordu)
    kaldırıldı. Bu sayfalar artık yalnızca backend'deki gerçek kursları/kayıtları gösteriyor.
    `MockDataService.courses` yalnızca Admin panelinin henüz backend'e bağlanmamış sayfalarında
    (Kategoriler, Genel Bakış) kullanılmaya devam ediyor.
  - **YAPILDI (2026-07-09) — Admin eğitim yönetimi gerçek veriye bağlandı:** Yeni endpoint
    `GET /api/courses/all` (yalnızca Admin; pasif/taslak dahil TÜM kurslar). Admin "Eğitim
    Yönetimi" sayfası (`admin-course-list`) mock'tan koparıldı: liste/kategori filtresi gerçek
    veriden, aktif-pasif toggle `PUT /api/courses/{id}` ile DB'ye yazıyor, "Detay" butonu kurs
    yönetim sayfasına (`/instructor/courses/:id`) gidiyor. Ayrıca `GET /api/courses/{id}`
    düzeltildi: pasif kursun detayını artık sahibi eğitmen ve Admin görebiliyor (yönetim için
    gerekli), katılımcıya yine 404. Aynı gün: eğitmen dashboard'undaki "Toplam Ders" kutusu
    "Toplam Eğitim" (kurs sayısı) olarak değiştirildi (kullanıcı isteği).
  - **YAPILDI (2026-07-09) — 5 içerik tipi + ders özeti:** `LessonContentType` enum'a `Link` ve
    `Image` eklendi (int saklandığı için migration gerekmedi). Yeni taksonomi: `Link` (URL
    bağlantısı; YouTube ise player'da gömülür, değilse "Bağlantıyı Aç" butonu) ve `Text` bugün
    tam çalışır; `Image`/`Document`/`Video` dosya YÜKLEME tipleri — depolama altyapısı gelene
    kadar formlarda "yükleme yakında" kutusu gösterilir ve ders içeriksiz kaydedilebilir
    (validator: URL yalnızca `Link` tipinde zorunlu). Eski URL'li `Video` dersleri çalışmaya
    devam eder. Ayrıca `Lesson.Description` = "Ders Özeti" (dersin kısa yazılı anlatımı,
    player'ın Genel Bakış sekmesinde): 1000→2000 karakter (migration `ExpandLessonDescription`).
  - **YAPILDI (2026-07-09) — Doğrudan dosya yükleme (yerel disk):** Senior onaylı plan uygulandı.
    `IFileStorageService`/`FileStorageService` (LMS.Business; uzantı beyaz listesi + boyut sınırı:
    foto 5MB, sunum/PDF 25MB, video 300MB; GUID dosya adı) + `POST /api/uploads`
    (Instructor/Admin, multipart) + `app.UseStaticFiles()` ile `wwwroot/uploads` sunumu.
    DB'de yalnızca dosya YOLU tutulur (`ContentUrl` = `/uploads/images/xxx.png` gibi).
    Frontend: `UploadService` + iki ders formunda gerçek dosya seçici (seçince hemen yüklenir),
    player'da foto `<img>`, PDF gömülü `<iframe>` (+ yeni sekmede aç), diğer dökümanlar
    indirme butonu, yüklenen video `<video controls>`. Yükleme tiplerinde dosya artık zorunlu
    (frontend'de; backend validator hâlâ esnek). `uploads` klasörü git'e DAHİL (kullanıcı
    kararı: repo çekilince dosyalar da gelsin). Not: statik dosyalar token istemez —
    kapalı kurum içi sistem için kabul edildi, canlıda korumalı sunum düşünülebilir.
  - **YAPILDI (2026-07-13) — MinIO'ya geçiş:** Dosya depolama artık S3-uyumlu MinIO
    (`Storage:Provider` = "Minio" | "Local", appsettings.json). `MinioFileStorageService`
    (bucket `lms-uploads`, ilk kullanımda otomatik oluşturma + public-read policy, DB'ye tam
    URL yazılır: `http://localhost:9000/lms-uploads/...`). Doğrulama kuralları iki sağlayıcıda
    ortak (`UploadRules`). "Local" seçilirse eski wwwroot/uploads davranışı sürer; eski
    `/uploads/...` URL'li kayıtlar çalışmaya devam eder (frontend `isUploadedFile` ikisini de
    tanır). MinIO Windows'ta tek exe: `minio.exe server C:\minio\data --console-address :9001`.
    Aynı gün: kurs kapağı base64/dataURL olarak DB'ye yazılmıyor artık — upload API ile dosya
    olarak kaydediliyor (1.8MB'lık liste cevabı 438B'a düştü; mevcut kayıt taşındı).
- Sertifika sistemi
- Periyodik eğitim mekanizması — **KARAR (2026-07-16): YAPILMAYACAK** (kapsam dışı bırakıldı)
- İlerleme (progress) ölçümü:
  - **YAPILDI (2026-07-08) — Ders tamamlama takibi backend'de:** `LessonCompletion` entity +
    `LessonCompletions` tablosu (UserId+LessonId unique) + `ProgressController`
    (toggle + my). İlerleme = tamamlanan ders / toplam ders yüzdesi. Frontend
    (player/eğitimlerim/dashboard) localStorage yerine bu API'yi kullanır
    (`ProgressService`, optimistik toggle). Eğitmen, katılımcı listesinde her
    öğrencinin gerçek ilerlemesini görür (`CourseAttendeeDto.Progress`).
    Ayrıca aynı gün: `Lesson.Notes` alanı (eğitmen ders notu, player "Notlar"
    sekmesi) ve kurs oluşturmada kapak rengi seçimi (foto opsiyonel; foto yoksa
    seçilen renkten gradient kapak) eklendi.
- Duyuru (announcements) modülü — 2026-07-08 kararı: şimdilik ertelendi (kullanıcı isteği)
- Zorunlu eğitim / atama sistemi:
  - **YAPILDI (2026-07-13) — Backend tamamlandı:** `Course.IsMandatory` + `Enrollment.IsAssigned`
    + `Enrollment.DueDate` (migration `AddMandatoryCoursesAndAssignments`). Kurallar: zorunlu
    işareti yalnızca Admin koyar (Instructor gönderirse yok sayılır); zorunlu kurslar katalogda
    (GET /api/courses) yalnızca atanmışlara görünür, detayı da öyle (yetkisize 404); kendi
    isteğiyle katılma 403; atanmış kayıttan ayrılma 403. Yeni uçlar (yalnızca Admin):
    `POST /api/enrollments/assign` {userId, courseId, dueDate} ve
    `DELETE /api/enrollments/assign/{courseId}/{userId}`. Atama = Enrollment satırı (ayrı tablo
    yok) — player/ilerleme/rapor altyapısı otomatik çalışır; gönüllü kayıt atamaya çevrilebilir,
    atama kaldırılınca tamamlama kayıtları (LessonCompletions) korunur. Rapor:
    `GET /api/enrollments/course/{id}` artık `isAssigned`, `dueDate`, `isOverdue`
    (ilerleme<%100 ve tarih geçti — anlık hesap) döner. FRONTEND HENÜZ YOK: admin atama
    ekranı, rapor tablosu, "Zorunlu" rozetleri, "Ayrıl" gizleme sıradaki iş.
  - Karar (2026-07-13): kullanıcı seçimi şimdilik tek tek; filtre/toplu atama sonra.
    İleride genel "permit listesi" (kurs bazlı görünürlük) planlanıyor — henüz yapma.

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
  DELETE /api/enrollments/{courseId}  → kayıtlı kurstan ayrıl (CourseAttendee, yalnızca kendi kaydı)
  GET    /api/enrollments/my          → kullanıcının katıldığı kurslar
  GET    /api/enrollments/course/{courseId} → kursa katılanlar + ilerleme yüzdeleri (kursun sahibi Instructor veya Admin)

ProgressController
  POST   /api/progress/lessons/{lessonId}/toggle → dersi tamamla / geri al (CourseAttendee, kursa kayıt şartı)
  GET    /api/progress/my             → kullanıcının tamamladığı ders id listesi
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
