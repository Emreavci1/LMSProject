using System.Text.Json;
using System.Text.Json.Serialization;

namespace LMS.Api;

// Tarih/saat alanlarını her zaman UTC olarak taşır.
// Neden: SQL Server'dan okunan DateTime'ların Kind bilgisi kaybolur (Unspecified);
// "Z" eki olmadan serileştirilirse tarayıcı yerel saat sanır ve saatler kayar.
// Bu converter: gelen değeri UTC kabul eder, gidene "Z" ekletir —
// Angular'ın date pipe'ı da kullanıcıya kendi yerel saatini gösterir.
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetDateTime();
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
        writer.WriteStringValue(utc);
    }
}
