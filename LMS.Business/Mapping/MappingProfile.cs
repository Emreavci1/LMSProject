using AutoMapper;
using LMS.DTO.Courses;
using LMS.DTO.Enrollments;
using LMS.DTO.Lessons;
using LMS.DTO.Users;
using LMS.Entities;

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
            .ForMember(d => d.StudentCount, opt => opt.MapFrom(s => s.Enrollments.Count));

        CreateMap<Enrollment, EnrollmentDto>()
            .ForMember(d => d.CourseTitle, opt => opt.MapFrom(s => s.Course.Title))
            .ForMember(d => d.InstructorName, opt => opt.MapFrom(s => s.Course.Instructor.FullName));

        CreateMap<Enrollment, CourseAttendeeDto>()
            .ForMember(d => d.FullName, opt => opt.MapFrom(s => s.User.FullName))
            .ForMember(d => d.Email, opt => opt.MapFrom(s => s.User.Email))
            // Progress ayrı sorguyla hesaplanır (EnrollmentService), mapper doldurmaz
            .ForMember(d => d.Progress, opt => opt.Ignore());

        CreateMap<Lesson, LessonDto>()
            .ForMember(d => d.ContentType, opt => opt.MapFrom(s => s.ContentType.ToString()));
    }
}
