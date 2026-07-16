using AutoMapper;
using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Categories;
using LMS.Entities;

namespace LMS.Business.Services;

// Kategori işlemleri. Ekleme/silme yetkisi controller'da [Authorize(Roles = "Admin")]
// ile korunur; burada iş kuralları (benzersiz ad, kullanımda olan kategori silinemez) uygulanır.
public class CategoryService : ICategoryService
{
    private readonly IRepository<Category> _categoryRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IMapper _mapper;

    public CategoryService(
        IRepository<Category> categoryRepository,
        ICourseRepository courseRepository,
        IMapper mapper)
    {
        _categoryRepository = categoryRepository;
        _courseRepository = courseRepository;
        _mapper = mapper;
    }

    public async Task<ServiceResult<List<CategoryDto>>> GetAllAsync()
    {
        var categories = await _categoryRepository.GetAllAsync();
        var ordered = categories.OrderBy(c => c.Name).ToList();
        return ServiceResult<List<CategoryDto>>.Ok(_mapper.Map<List<CategoryDto>>(ordered));
    }

    public async Task<ServiceResult<CategoryDto>> CreateAsync(CreateCategoryDto dto)
    {
        var name = dto.Name.Trim();

        // Aynı adla (büyük/küçük harf duyarsız) kategori varsa ekleme
        var existing = await _categoryRepository.GetAllAsync(c => c.Name == name);
        if (existing.Count > 0)
            return ServiceResult<CategoryDto>.Fail(ServiceErrorType.Validation, "Bu kategori zaten mevcut.");

        var entity = new Category { Name = name };
        await _categoryRepository.AddAsync(entity);
        await _categoryRepository.SaveChangesAsync();

        return ServiceResult<CategoryDto>.Ok(_mapper.Map<CategoryDto>(entity));
    }

    public async Task<ServiceResult> DeleteAsync(int id)
    {
        var entity = await _categoryRepository.GetByIdAsync(id);
        if (entity == null)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Kategori bulunamadı.");

        // Kullanımda olan kategori silinemez: kursların etiketi boşta kalırdı
        var coursesUsing = await _courseRepository.GetAllAsync(c => c.Category == entity.Name);
        if (coursesUsing.Count > 0)
            return ServiceResult.Fail(ServiceErrorType.Validation,
                "Bu kategoride eğitim var; önce eğitimleri başka kategoriye taşıyın.");

        _categoryRepository.Remove(entity);
        await _categoryRepository.SaveChangesAsync();

        return ServiceResult.Ok();
    }
}
