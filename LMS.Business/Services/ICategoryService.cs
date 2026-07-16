using LMS.Business.Common;
using LMS.DTO.Categories;

namespace LMS.Business.Services;

public interface ICategoryService
{
    Task<ServiceResult<List<CategoryDto>>> GetAllAsync();
    Task<ServiceResult<CategoryDto>> CreateAsync(CreateCategoryDto dto);
    Task<ServiceResult> DeleteAsync(int id);
}
