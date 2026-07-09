# LÖSEV LMS — Proje Rehberi ve Hesap Verebilirlik Notları

> Bu doküman iki amaçla yazıldı:
> 1. **Kendin için:** Projenin nasıl çalıştığını baştan sona anlaman.
> 2. **Kurum için:** "Ne yaptın, nasıl çalışıyor, güvenli mi?" sorularına
>    net cevap verebilmen.
>
> Teknik terimlerin hepsi ilk geçtiği yerde açıklanır; ayrıca en sonda sözlük var.

---

## 1. Proje Nedir?

LÖSEV için **kapalı devre bir Eğitim Yönetim Sistemi (LMS)**:

- Kurum içi **eğitmenler** kurs açar, içerik ekler.
- **Katılımcılar** açık kursları görür, katılır, dersleri izler/okur.
- **Admin** kullanıcıları yönetir (dışarıdan kimse kendi hesabını açamaz —
  kayıt sayfası bilinçli olarak YOK).

Üç rol vardır: **Admin**, **Instructor** (eğitmen), **CourseAttendee** (katılımcı).

---

## 2. Teknoloji Seçimleri ve Nedenleri

| Katman | Teknoloji | Neden bu? |
|---|---|---|
| Backend | ASP.NET Core Web API (.NET 10) | Kurumsal standart, uzun destek, güçlü güvenlik altyapısı |
| ORM | Entity Framework Core | SQL yazmadan C# sınıflarıyla veritabanı yönetimi; migration desteği |
| Veritabanı | MS SQL Server (LocalDB geliştirmede) | Kurumsal ortamların yaygın tercihi |
| Frontend | Angular (standalone components) | Kurumsal ölçekli, yapısı disiplinli SPA framework'ü |
| UI | Angular Material | Hazır, erişilebilir, responsive bileşenler |
| Kimlik doğrulama | JWT (JSON Web Token) | API'lerde standart, sunucuda oturum saklamayı gerektirmez |
| API dokümantasyonu | Swagger / OpenAPI | Tüm endpoint'lerin canlı, tıklanabilir dökümü |
| Nesne dönüşümü | AutoMapper | Entity ↔ DTO dönüşümlerini tek yerde toplar |
| Doğrulama | FluentValidation | İstek doğrulama kurallarını okunabilir sınıflara ayırır |

**Anlatırken bir cümle:** "Microsoft yığını (.NET + SQL Server) üzerine, kurumsal
projelerde standart olan katmanlı mimariyle kurulmuş; önyüzü Angular olan bir web uygulaması."

---

## 3. Mimari — Büyük Resim

### 3.1 Backend: Katmanlı Mimari

Solution (`LMS.slnx`) 5 ayrı projeden oluşur. **Her katmanın tek bir görevi vardır**
ve yalnızca alt katmanına erişebilir:

```
LMS.Api          → HTTP'yi karşılar: Controller'lar, JWT ayarı, Program.cs
   ↓
LMS.Business     → İş mantığı: Service sınıfları (kurallar, sahiplik kontrolleri)
   ↓
LMS.DataAccess   → Veritabanı erişimi: DbContext, Repository'ler, Migrations
   ↓
LMS.Entities     → Veritabanı tablolarının C# karşılıkları (User, Course, Enrollment)

LMS.DTO          → API'nin dışa açtığı veri şekilleri (Business ve Api kullanır)
```

**Neden katmanlı?** (sorulursa)
- Her şeyin yeri belli: hata veritabanındaysa DataAccess'e, kural hatasıysa Business'a bakılır.
- Controller'lar iş mantığı içermez → aynı mantık farklı yerlerden (ileride mobil uygulama vb.) kullanılabilir.
- Test edilebilirlik: Service katmanı, veritabanı olmadan test edilebilir (repository arayüzleri sayesinde).

### 3.2 Kim kime erişebilir? (kritik kurallar)

- Controller **asla** DbContext'e dokunmaz → her zaman Service çağırır.
- Service **asla** DbContext'e dokunmaz → her zaman Repository çağırır.
- Entity'ler (örn. `User`) **asla** API'den dışarı dönülmez → her zaman DTO döner.
  Örnek: `User` entity'sinde `PasswordHash` var; ama dışarı dönen `UserDto`'da YOK.
  Böylece hassas alanların sızması yapısal olarak imkânsız hale gelir.

### 3.3 Frontend: Angular Klasör Yapısı

```
lms-client/src/app/
├── core/                 → Uygulamanın altyapısı
│   ├── services/         → API çağrıları (auth, course, lesson, enrollment,
│   │                        progress, user)
│   ├── guards/           → Sayfa erişim bekçileri (authGuard, roleGuard)
│   ├── interceptors/     → Her API isteğine JWT token'ı otomatik ekler
│   ├── models/           → Backend DTO'larının TypeScript karşılıkları
│   └── utils/            → Ortak yardımcılar (kapak görseli CSS'i vb.)
├── features/             → Sayfalar (özellik bazında klasörlenmiş)
│   ├── auth/login        → Giriş sayfası
│   ├── dashboard/        → Role göre farklı ana sayfa
│   ├── student/          → Katılımcı: keşfet, eğitimlerim, oynatıcı
│   ├── instructor/       → Eğitmen: kurslarım, kurs oluştur, yönet
│   ├── admin/            → Admin: kullanıcılar, kurslar, kategoriler
│   └── courses/          → Ortak: kurs detay sayfası
└── shared/components/    → Ortak UI parçaları (panel yerleşimi, dialog vb.)
```

---

## 4. Bir İsteğin Yaşam Döngüsü (uçtan uca örnek)

**Senaryo: Eğitmen yeni kurs oluşturuyor.**

1. **Angular** — Eğitmen formu doldurur, "Yayınla" der.
   `CourseService.create(...)` çağrılır → `POST /api/courses` isteği hazırlanır.
2. **Interceptor** — `auth.interceptor.ts` devreye girer, isteğin başlığına
   `Authorization: Bearer <token>` ekler. (Eğitmen bunu görmez, otomatiktir.)
3. **Backend / Kimlik** — ASP.NET Core token'ı doğrular: imza geçerli mi,
   süresi dolmuş mu? Geçersizse **401 Unauthorized** döner, iş mantığına hiç girilmez.
4. **Controller** — `CourseController.Create` çalışır. `[Authorize(Roles = "Instructor,Admin")]`
   sayesinde katılımcı rolü buraya giremez (**403 Forbidden**).
5. **Validation** — FluentValidation kuralları çalışır (başlık boş mu, çok uzun mu?).
   Kural ihlalinde otomatik **400 Bad Request** + hata mesajı döner.
6. **Service** — `CourseService.CreateAsync`: kursu oluşturur, `InstructorId`'yi
   **token'daki kullanıcıdan** alır (istemcinin gönderdiği değere güvenilmez!).
7. **Repository** — `CourseRepository.AddAsync` + `SaveChangesAsync` → EF Core
   SQL üretir, SQL Server'a yazar.
8. **Dönüş** — Entity, AutoMapper ile `CourseDto`'ya çevrilir → **201 Created** + JSON.
9. **Angular** — Cevabı alır, bildirim gösterir, eğitmeni kurs listesine yönlendirir.

Bu akışı anlatabiliyorsan mimarinin %80'ini anlatabiliyorsun demektir.

---

## 5. Güvenlik (en çok sorulacak bölüm)

### 5.1 Kimlik Doğrulama (Authentication) — "Sen kimsin?"

- Kullanıcı `POST /api/auth/login`'e e-posta + şifre gönderir.
- Backend şifreyi doğrularsa bir **JWT token** üretir ve döner.
- **JWT nedir?** İçinde kullanıcının kimliği (id, ad, rol) ve son geçerlilik tarihi
  yazan, sunucunun **gizli anahtarla imzaladığı** bir metin. İçeriği değiştirilirse
  imza bozulur ve sunucu reddeder. Süresi 60 dakikadır; dolunca yeniden giriş gerekir.
- Login dışındaki **tüm** endpoint'ler `[Authorize]` ile korunur: token yoksa 401.

### 5.2 Şifre Güvenliği

- Şifreler **asla düz metin saklanmaz**. ASP.NET Core Identity'nin `PasswordHasher`'ı
  kullanılır (PBKDF2 algoritması: tek yönlü, tuzlu/salted hash).
- "Tek yönlü" demek: hash'ten şifre geri çıkarılamaz. Veritabanı ele geçse bile
  şifrelerin kendisi ele geçmez.
- Girişte, girilen şifre aynı yöntemle hash'lenip kayıtlı hash ile karşılaştırılır.

### 5.3 Yetkilendirme (Authorization) — "Buna hakkın var mı?"

İki seviye vardır ve **ikisi de backend'dedir**:

1. **Rol kontrolü:** `[Authorize(Roles = "Admin")]` gibi — endpoint'e hangi roller girebilir.
2. **Kaynak sahipliği kontrolü:** Rol yetmez! Örnek: Bir eğitmen `PUT /api/courses/5`
   çağırdığında, Service katmanı **o kursun gerçekten bu eğitmene ait olduğunu**
   veritabanından doğrular (`course.InstructorId != currentUserId` ise 403).
   Yani Eğitmen A, Eğitmen B'nin kursunu API'yi doğrudan çağırarak bile değiştiremez.

### 5.4 Frontend Güvenliği ≠ Gerçek Güvenlik

- Angular'daki guard'lar (`authGuard`, `roleGuard`) ve gizlenen butonlar yalnızca
  **kullanıcı deneyimi** içindir.
- Gerçek güvenlik her istekte **backend'de yeniden** doğrulanır. Birisi tarayıcı
  konsolundan istek uydursta bile backend reddeder.
- **Sorulursa:** "Frontend'de gizlemek güvenlik değildir; biz her isteği sunucuda
  tekrar yetkilendiriyoruz."

### 5.5 Diğer Güvenlik Önlemleri

- **CORS:** Backend yalnızca `http://localhost:4200` (Angular) kaynağından gelen
  tarayıcı isteklerini kabul eder. Canlıya çıkarken gerçek alan adıyla güncellenmeli.
- **SQL Injection:** EF Core tüm sorguları parametreli üretir; string birleştirmeyle
  SQL yazılmadığı için klasik SQL injection kapısı kapalıdır.
- **Soft delete:** Kullanıcı silme aslında `IsActive=false` yapar — veri kaybolmaz,
  hesap verilebilirlik korunur.
- **UserId asla istemciden alınmaz:** Kursa katılma gibi işlemlerde kullanıcı kimliği
  her zaman token'dan okunur; "başkası adına işlem" yapılamaz.

---

## 6. Veritabanı

### 6.1 Tablolar ve İlişkiler

```
Users (Id, FullName, Email[unique], PasswordHash, Role, IsActive, CreatedDate)
  │ 1                                          │ 1
  │ n                                          │ n
Courses (Id, Title, Description, InstructorId → Users, Category, Level,
         DurationHours, LessonCount, Status, PublishDate, CoverImageUrl,
         IsActive, CreatedDate)                Enrollments (Id, UserId → Users,
  │ 1                                                       CourseId → Courses, EnrollDate)
  │ n                                            ► (UserId, CourseId) UNIQUE — aynı kişi
Lessons (Id, CourseId → Courses, Section,          aynı kursa iki kez kaydolamaz
         Title, Description, DurationMin,
         ContentType, ContentUrl, TextContent,
         Notes, Order, CreatedDate)
  │ 1
  │ n
LessonCompletions (Id, UserId → Users, LessonId → Lessons, CompletedDate)
  ► (UserId, LessonId) UNIQUE — aynı ders iki kez "tamamlandı" işaretlenemez
```

- **Lesson.ContentType** (enum): `Link` (URL bağlantısı — YouTube ise oynatıcıda
  gömülü açılır), `Text` (doğrudan metin), `Image`/`Document`/`Video` (dosya yükleme:
  dosya sunucudaki `uploads` klasörüne kaydedilir, `ContentUrl` alanında yalnızca
  dosyanın YOLU tutulur — dosyanın kendisi veritabanına girmez). Kurs silinince
  dersleri de silinir (Cascade); ders silinince tamamlama kayıtları da silinir (Cascade).
- **İlerleme (progress):** Kullanıcının bir kurstaki ilerlemesi = tamamladığı ders
  sayısı / kursun toplam ders sayısı (yüzde). `LessonCompletions` tablosundan hesaplanır,
  tarayıcıda tutulmaz — bu yüzden farklı cihazdan girildiğinde de doğru görünür.

- **Course.Status:** `Draft` (taslak — sadece eğitmen görür) → `Scheduled`
  (ileri tarihli) → `Published` (katılımcılara açık). Katalog endpoint'i yalnızca
  Published + aktif kursları döner.

### 6.2 Migration Nedir? (sorulursa)

- Migration = veritabanı şemasındaki her değişikliğin **kod olarak kaydı**.
- Entity sınıfı değişince `dotnet ef migrations add <isim>` ile fark kaydedilir;
  uygulama açılışta bekleyen migration'ları otomatik uygular.
- Faydası: veritabanının nasıl bu hale geldiğinin **adım adım tarihi** vardır;
  başka bir makinede sıfırdan aynı şema kurulabilir.

### 6.3 Seed (Başlangıç Verisi)

- İlk çalıştırmada `DbSeeder` bir **Admin** kullanıcısı oluşturur (kapalı sistemde
  ilk kullanıcı başka türlü var olamazdı) + geliştirme için test eğitmen/katılımcı.

---

## 7. Frontend İşleyişi (Angular tarafı)

- **Login sonrası:** Token tarayıcıda saklanır; `AuthService` aktif kullanıcıyı
  (ad, rol) bir signal'de tutar. Menü ve yönlendirmeler role göre şekillenir.
- **Interceptor:** Her API isteğine token'ı otomatik ekler; 401 dönerse kullanıcıyı
  login'e yönlendirir. Tek yerde çözülür, her serviste tekrarlanmaz.
- **Guard'lar:** `authGuard` (giriş yapılmış mı?), `roleGuard` (bu role açık mı?).
  Örn. `/admin/users` rotasına katılımcı giremez.
- **Signal tabanlı state:** Angular'ın güncel reaktivite modeli; bir veri değişince
  onu kullanan ekran parçaları otomatik güncellenir.
- **Responsive:** Mobile-first; kartlar grid ile 1→2→3→4 kolona genişler,
  menü mobilde hamburgera dönüşür.

---

## 8. Kalite Nitelikleri (Quality Attributes) Karşılıkları

| Nitelik | Bu projede karşılığı |
|---|---|
| **Güvenlik** | JWT + rol + sahiplik kontrolü, hash'li şifre, DTO ile veri sızıntısı engeli, parametreli SQL |
| **Sürdürülebilirlik** | Katmanlı mimari, tek sorumluluk, DI ile gevşek bağlılık, Türkçe açıklama satırları |
| **Test edilebilirlik** | Service'ler arayüzlere (interface) bağımlı → sahte (mock) repository ile test edilebilir |
| **İzlenebilirlik** | Git commit geçmişi, migration geçmişi, Swagger dokümantasyonu |
| **Kullanılabilirlik** | Responsive tasarım, anlaşılır Türkçe hata mesajları, yükleme göstergeleri |
| **Veri bütünlüğü** | Unique kısıtlar (e-posta, kayıt tekilliği), FK ilişkileri, soft delete |

**DI (Dependency Injection) nedir?** Sınıflar ihtiyaç duydukları nesneleri kendileri
üretmez; sistem dışarıdan verir (constructor'dan). Faydası: bir parçayı değiştirmek
(örn. gerçek repository yerine test sahtesi) diğerlerini bozmaz.

---

## 9. Geçici Çözümler ve Bilinenler (dürüst envanter)

Sorulduğunda saklamak yerine "biliyoruz, planı şu" diyebilmen için:

1. **Dosya yükleme yerel diske yapılıyor (bulut yok).** 5 içerik tipinin tamamı
   çalışıyor: `Link` (URL) ve `Text` (okuma metni) + dosya yüklemeli
   `Image`/`Document`/`Video`. Yüklenen dosya sunucuda `wwwroot/uploads` klasörüne
   GUID adla kaydedilir; veritabanında yalnızca dosyanın **yolu** tutulur, dosyanın
   kendisi değil (senior onaylı yaklaşım — veritabanı şişmez). Güvenlik: uzantı
   beyaz listesi (`.exe` gibi dosyalar reddedilir), tipe göre boyut sınırı (foto
   5 MB, sunum/PDF 25 MB, video 300 MB), dosya adı kullanıcıdan alınmaz (GUID),
   yükleme yalnızca eğitmen/admin rolüne açık. `uploads/` klasörü git'e dahildir:
   repo başka bilgisayara çekilince dosyalar da gelir. **Bilinen sınırlar:**
   dosyalar token'sız erişilebilir (URL'i bilen açar — kapalı kurum içi sistem için
   kabul edildi, canlıda korumalı sunum düşünülmeli) ve ders silinince dosya diskte
   kalıyor (öksüz dosya temizliği ileride eklenebilir).
2. **Bazı ekran verileri hâlâ göstermelik (mock).** Yalnızca Admin panelinin
   backend'e henüz bağlanmamış sayfaları: Tüm Kurslar, Kategoriler, Genel Bakış
   (grafikler/bakiye). Kurs/ders/katılım/ilerleme/kullanıcı akışlarının tamamı
   gerçek API'ye bağlı — katalogdaki demo kurslar da temizlendi.
3. **AutoMapper paketinde bilinen güvenlik uyarısı var** (derlemede NU1903 uyarısı).
   Kütüphanenin güvenli sürümüne yükseltme yapılmalı — yapılacaklar listesinde.
4. **Kapak görselleri base64 metin olarak veritabanında.** Çalışır ama büyük
   görsellerde verimsizdir; dosya yükleme altyapısı gelince dosya olarak saklanacak.
   Foto yüklemek istemeyen eğitmen için alternatif olarak **kapak rengi seçimi**
   eklendi (renkten gradient kapak üretilir, foto zorunlu değil).
5. **JWT gizli anahtarı `appsettings.json`'da.** Geliştirme için normal; canlıya
   çıkarken ortam değişkenine/gizli kasaya (secret store) taşınmalı.
6. **Zamanlanmış kurslar otomatik yayına girmiyor.** `Scheduled` kurs, tarihi
   gelince el ile yayınlanmalı; otomatik iş (background job) ileride eklenebilir.
7. **Duyurular (announcements) modülü yok.** Kullanıcı kararıyla ertelendi;
   oynatıcıdaki "Duyurular" sekmesi şimdilik boş görünür.

---

## 10. Hesap Verebilirlik: "Ne Yaptın?" Sorusuna Kanıtla Cevap

### 10.1 Git — işin tarihçesi (ana araç)

**Git nedir?** Kodun her anlamlı değişikliğini kim/ne zaman/neden bilgisiyle
kaydeden sürüm kontrol sistemi. Her kayda **commit** denir.

Sana sağladıkları:
- `git log` → yapılan her işin tarih sıralı listesi (kanıt).
- `git show <commit>` → belirli bir değişiklikte tam olarak hangi satırların
  değiştiği (satır satır gösterebilirsin).
- Bir şey bozulursa önceki herhangi bir noktaya dönülebilir (geri alınabilirlik).

**Commit disiplini (önerilen):** Her anlamlı iş bittiğinde tek konu = tek commit,
mesajı Türkçe ve açıklayıcı: `"Kurs detay sayfası eklendi: müfredat + katılma akışı"`.

Sık kullanacağın komutlar:
```bash
git status                    # neler değişmiş?
git add -A                    # değişiklikleri sahneye al
git commit -m "mesaj"         # kaydet
git log --oneline             # geçmişi kısa listele
git show <commit-no>          # bir commit'in tüm değişikliği
```

İleride kurum bir GitHub/GitLab/Azure DevOps hesabı verirse `git push` ile bu
geçmiş merkezi sunucuya da taşınır ve ekip görebilir.

### 10.2 Swagger — API'nin canlı dökümü

Backend çalışırken `http://localhost:5091/swagger` adresi, tüm endpoint'leri
(adres, metod, istek/cevap şekilleri) otomatik listeler. "API'de neler var?"
sorusunun cevabını **koddan üretilen** güncel bir sayfayla gösterirsin.

### 10.3 Dokümanlar

- **`CLAUDE.md`** → projenin spesifikasyonu (ne isteniyor, kurallar, fazlar).
- **`PROJE-REHBERI.md`** (bu dosya) → nasıl çalıştığının açıklaması.
- Migration dosyaları → veritabanının değişim tarihi.

Bu üçlü + git geçmişi ile "ne istendi → ne yapıldı → nasıl çalışıyor" zincirini
uçtan uca gösterebilirsin.

---

## 11. Sorulara Hazır Cevaplar (SSS)

**S: Şifreler nerede, nasıl saklanıyor?**
C: Veritabanında, ASP.NET Core Identity'nin PBKDF2 tabanlı tek yönlü hash'i olarak.
Düz metin şifre hiçbir yerde yok; hash'ten şifre geri çıkarılamaz.

**S: Bir eğitmen başkasının kursunu değiştirebilir mi?**
C: Hayır. Rol kontrolüne ek olarak service katmanında kaynak sahipliği kontrolü var:
kursun `InstructorId`'si istek yapan kullanıcıyla eşleşmiyorsa 403 döner. Bu kontrol
sunucuda olduğu için arayüz atlanarak da (ör. Postman ile) delinemez.

**S: Dışarıdan biri sisteme kayıt olabilir mi?**
C: Hayır, kayıt endpoint'i yok. Kullanıcıları yalnızca Admin oluşturur (kapalı sistem).

**S: Token çalınırsa ne olur?**
C: Token 60 dakika geçerlidir; süresi dolunca kullanılamaz. HTTPS kullanımı ve kısa
ömür riski sınırlar. (İleri adım olarak refresh token / iptal listesi eklenebilir.)

**S: SQL injection'a karşı önlem var mı?**
C: Tüm veritabanı erişimi EF Core üzerinden parametreli sorgularla yapılıyor;
elle SQL birleştirme yok.

**S: Neden Entity yerine DTO dönüyorsunuz?**
C: Entity veritabanının iç yapısıdır ve hassas alan içerebilir (örn. PasswordHash).
DTO yalnızca dışarıya açılması gereken alanları taşır; sızıntıyı yapısal olarak önler.

**S: Taslak kurs katılımcıya görünür mü?**
C: Hayır. Katalog sorgusu veritabanı seviyesinde yalnızca `Published` + aktif
kursları döner; taslağı yalnızca sahibi görür.

**S: Uygulama mobilde çalışıyor mu?**
C: Evet, tüm sayfalar responsive (mobile-first); ayrı mobil uygulama değil,
aynı web arayüzü her ekrana uyum sağlıyor.

**S: Bir katılımcının ilerlemesi nasıl hesaplanıyor?**
C: Tamamladığı ders sayısı / kursun toplam ders sayısı. `LessonCompletions`
tablosunda tutulur (tarayıcıda değil), bu yüzden eğitmen de katılımcı listesinde
gerçek yüzdeyi görür ve katılımcı farklı cihazdan girse de ilerlemesi korunur.

**S: Eğitmen kendi kursunu katılımcı gibi görebilir mi?**
C: Evet, "Önizle" ile aynı oynatıcı arayüzü açılır ama önizleme modunda ders
tamamlama işaretlenmez (backend zaten katılımcı olmayan biri için bu isteği reddeder).

---

## 12. Mini Sözlük

| Terim | Karşılığı |
|---|---|
| **API** | Uygulamanın dış dünyaya açtığı, HTTP ile konuşulan kapılar bütünü |
| **Endpoint** | API'deki tek bir kapı (örn. `POST /api/auth/login`) |
| **REST** | Endpoint'leri kaynak + HTTP fiiliyle (GET/POST/PUT/DELETE) düzenleme yaklaşımı |
| **Entity** | Veritabanı tablosunun C# sınıf karşılığı |
| **DTO** | Data Transfer Object — API'nin dışarıyla konuştuğu veri şekli |
| **ORM** | Nesne ↔ tablo eşleyicisi (bizde EF Core); SQL'i senin yerine yazar |
| **Migration** | Veritabanı şema değişikliğinin kod olarak kaydı |
| **JWT** | İmzalı kimlik bileti; her istekte kimlik ispatı |
| **Claim** | Token'ın içindeki tekil bilgi (kullanıcı id'si, rolü vb.) |
| **Hash** | Tek yönlü matematiksel özet; şifre saklamanın güvenli yolu |
| **DI** | Bağımlılıkların dışarıdan verilmesi; gevşek bağlılık sağlar |
| **Repository** | Veritabanı erişimini soyutlayan katman |
| **Guard** | Angular'da sayfa erişim bekçisi |
| **Interceptor** | Angular'da tüm HTTP isteklerini araya girip işleyen katman |
| **Signal** | Angular'da değişince ekranı otomatik güncelleyen reaktif değer |
| **CORS** | Tarayıcının "hangi siteden gelen istek kabul?" güvenlik mekanizması |
| **Soft delete** | Kaydı silmek yerine pasife çekme (`IsActive=false`) |
| **Seed** | İlk kurulumda otomatik oluşturulan başlangıç verisi |

---

*Bu doküman proje geliştikçe güncellenmelidir — önemli her mimari karar ve yeni
modül buraya bir bölüm olarak eklenmeli.*
