using LMS.Business.Services;
using LMS.DTO.Categories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

// Kategoriler yalnızca kullanan rollere açık: liste kurs oluşturma formu için
// (Instructor/Admin), ekleme/silme yalnızca Admin (kategori yönetimi dialog'u).
// Katılımcıların ayrı bir kategori listesine ihtiyacı yok — Keşfet filtreleri
// zaten yayındaki kursların kategorilerinden türetiliyor.
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ApiControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _categoryService.GetAllAsync();
        return result.Success ? Ok(result.Data) : ToErrorResponse(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto)
    {
        var result = await _categoryService.CreateAsync(dto);
        return result.Success ? Created("", result.Data) : ToErrorResponse(result);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _categoryService.DeleteAsync(id);
        return result.Success ? NoContent() : ToErrorResponse(result);
    }
}
