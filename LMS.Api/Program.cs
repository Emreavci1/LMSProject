using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using LMS.Business.Mapping;
using LMS.Business.Services;
using LMS.Business.Settings;
using LMS.Business.Validators;
using LMS.DataAccess;
using LMS.DataAccess.Repositories;
using LMS.Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// --- 1) Veritabanı: EF Core + SQL Server ---
builder.Services.AddDbContext<LmsDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// --- 2) Dependency Injection kayıtları ---
// Scoped: her HTTP isteği için bir instance oluşturulur
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ICourseRepository, CourseRepository>();
builder.Services.AddScoped<IEnrollmentRepository, EnrollmentRepository>();
builder.Services.AddScoped<ILessonRepository, LessonRepository>();
builder.Services.AddScoped<ILessonCompletionRepository, LessonCompletionRepository>();
builder.Services.AddScoped<IAnnouncementRepository, AnnouncementRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddScoped<IEnrollmentService, EnrollmentService>();
builder.Services.AddScoped<ILessonService, LessonService>();
builder.Services.AddScoped<IProgressService, ProgressService>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();

// Arka plan görevi: yayın tarihi gelen zamanlanmış kursları otomatik yayınlar
builder.Services.AddHostedService<LMS.Api.Background.ScheduledCoursePublisher>();

// Dosya depolama: appsettings "Storage:Provider" seçimine göre
//  - "Minio": S3 uyumlu nesne depolama (MinIO sunucusu gerekir, bkz. README)
//  - "Local": wwwroot/uploads altına yerel disk (varsayılan/yedek)
// DB'de her iki durumda da dosyanın kendisi değil yalnızca URL'i tutulur.
var storageSettings = builder.Configuration.GetSection(StorageSettings.SectionName).Get<StorageSettings>()
    ?? new StorageSettings();
if (string.Equals(storageSettings.Provider, "Minio", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddSingleton<IFileStorageService>(new MinioFileStorageService(storageSettings.Minio));
}
else
{
    var uploadsRoot = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads");
    builder.Services.AddSingleton<IFileStorageService>(new FileStorageService(uploadsRoot));
}

// AutoMapper: MappingProfile'daki Entity ↔ DTO kurallarını yükle
builder.Services.AddAutoMapper(typeof(MappingProfile));

// FluentValidation: Business'taki tüm validator'ları bul ve kaydet.
// Auto-validation sayesinde kural ihlalinde otomatik 400 döner.
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();

// appsettings.json'daki "Jwt" bölümünü JwtSettings sınıfına bağla
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));

// --- 3) JWT Authentication ---
var jwtSettings = builder.Configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>()
    ?? throw new InvalidOperationException("appsettings.json içinde 'Jwt' bölümü eksik!");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Gelen token'ın hangi kurallara göre doğrulanacağı
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,          // süresi dolmuş token reddedilir
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
            ClockSkew = TimeSpan.Zero         // varsayılan 5 dk toleransı kaldır
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers().AddJsonOptions(options =>
    // Tüm tarih/saat alanları UTC taşınır ("Z" ekli) — tarayıcı yerel saate çevirir
    options.JsonSerializerOptions.Converters.Add(new LMS.Api.UtcDateTimeConverter()));

// CORS: Angular geliştirme sunucusundan (4200) gelen isteklere izin ver
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularClient", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// --- 4) Swagger (JWT destekli) ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "LMS API", Version = "v1" });

    // Swagger arayüzüne "Authorize" butonu ekler; token buraya yapıştırılır
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Login endpoint'inden aldığınız JWT token'ı girin."
    });
    options.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", doc), new List<string>() }
    });
});

var app = builder.Build();

// --- 5) Başlangıçta migration + seed (ilk Admin kullanıcısı) ---
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<LmsDbContext>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
    await DbSeeder.SeedAsync(context, hasher);
}

// --- 6) HTTP pipeline ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// wwwroot altındaki dosyaları sun (yüklenen ders içerikleri: /uploads/...).
// Not: statik dosyalar token istemez — URL'i bilen erişebilir. Kapalı kurum içi
// sistem için şimdilik kabul edilebilir; canlıda korumalı sunum düşünülebilir.
app.UseStaticFiles();

app.UseCors("AllowAngularClient");

// Sıralama önemli: önce kimlik doğrulama, sonra yetkilendirme
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
