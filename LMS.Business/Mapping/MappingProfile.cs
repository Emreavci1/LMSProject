using AutoMapper;
using LMS.DTO.Courses;
using LMS.DTO.Enrollments;
using LMS.DTO.Lessons;
using LMS.DTO.Users;
using LMS.Entities;
using LMS.Entities.Enums;

namespace LMS.Business.Mapping;

// Entity → DTO dönüşüm kuralları.
// Alan adları aynıysa AutoMapper otomatik eşler; farklıysa burada belirtiriz.
public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<User, UserDto>()
            .ForMember(d => d.Role, opt => opt.MapFrom(s => s.Role.ToString()));

        CreateMap<Course, CourseDto>()
            .ForMember(d => d.InstructorName, opt => opt.MapFrom(s => s.Instructor.FullName))
            .ForMember(d => d.Status, opt => opt.MapFrom(s => s.Status.ToString()))
            // Ders sayısı ve süre, gerçek derslerden hesaplanır (tek doğru kaynak).
            // Include(c => c.Lessons) yapılmış sorgularda dolu gelir.
            .ForMember(d => d.LessonCount, opt => opt.MapFrom(s => s.Lessons.Count))
            // GERÇEK toplam süre (dakika) — yuvarlama YOK. "Takribi saat" gösterimi
            // (98 dk → 2 saat) frontend'de bu toplamdan hesaplanır.
            .ForMember(d => d.DurationMinutes,
                opt => opt.MapFrom(s => s.Lessons.Sum(l => l.DurationMin)))
            // Katılımcı sayısı — Include(Enrollments) yapılmış sorgularda dolu gelir
            .ForMember(d => d.StudentCount, opt => opt.MapFrom(s => s.Enrollments.Count))
            // Kurum eğitimi: kursu açan Admin ise (katılımcı arayüzünde rozetle öne çıkar)
            .ForMember(d => d.IsOfficial,
                opt => opt.MapFrom(s => s.Instructor.Role == UserRole.Admin));

        CreateMap<Enrollment, EnrollmentDto>()
            .ForMember(d => d.CourseTitle, opt => opt.MapFrom(s => s.Course.Title))
            .ForMember(d => d.InstructorName, opt => opt.MapFrom(s => s.Course.Instructor.FullName));

        CreateMap<Enrollment, CourseAttendeeDto>()
            .ForMember(d => d.FullName, opt => opt.MapFrom(s => s.User.FullName))
            .ForMember(d => d.Email, opt => opt.MapFrom(s => s.User.Email))
            .ForMember(d => d.AvatarUrl, opt => opt.MapFrom(s => s.User.AvatarUrl))
            // Progress ayrı sorguyla hesaplanır (EnrollmentService), mapper doldurmaz
            .ForMember(d => d.Progress, opt => opt.Ignore())
            // IsOverdue da hesaplanan alan: ilerleme < %100 ve DueDate geçmişse (service doldurur)
            .ForMember(d => d.IsOverdue, opt => opt.Ignore());

        CreateMap<Lesson, LessonDto>()
            .ForMember(d => d.ContentType, opt => opt.MapFrom(s => s.ContentType.ToString()));
    }
}
