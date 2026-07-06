using AutoMapper;
using LMS.DTO.Courses;
using LMS.DTO.Enrollments;
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
            .ForMember(d => d.Status, opt => opt.MapFrom(s => s.Status.ToString()));

        CreateMap<Enrollment, EnrollmentDto>()
            .ForMember(d => d.CourseTitle, opt => opt.MapFrom(s => s.Course.Title))
            .ForMember(d => d.InstructorName, opt => opt.MapFrom(s => s.Course.Instructor.FullName));

        CreateMap<Enrollment, CourseAttendeeDto>()
            .ForMember(d => d.FullName, opt => opt.MapFrom(s => s.User.FullName))
            .ForMember(d => d.Email, opt => opt.MapFrom(s => s.User.Email));
    }
}
