namespace LMS.Entities;

// Eğitim kategorisi (örn. Sağlık, Teknoloji). Merkezi liste:
// kurs oluşturma formu, Keşfet filtreleri ve admin kategori yönetimi bunu kullanır.
// Kurslar kategoriye ad üzerinden bağlanır (Course.Category string) —
// mevcut veriyle uyum için FK yerine ad eşleşmesi tercih edildi.
public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
}
