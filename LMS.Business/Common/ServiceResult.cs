namespace LMS.Business.Common;

// Service katmanının işlem sonucunu controller'a bildirme şekli.
// Controller bu sonuca bakarak doğru HTTP kodunu döner:
// NotFound → 404, Forbidden → 403, Validation → 400
public enum ServiceErrorType
{
    None,
    NotFound,
    Forbidden,
    Validation
}

public class ServiceResult
{
    public bool Success { get; protected set; }
    public string? Error { get; protected set; }
    public ServiceErrorType ErrorType { get; protected set; }

    public static ServiceResult Ok()
        => new() { Success = true };

    public static ServiceResult Fail(ServiceErrorType type, string error)
        => new() { Success = false, ErrorType = type, Error = error };
}

// Veri de dönen işlemler için (örn. oluşturulan kursun kendisi)
public class ServiceResult<T> : ServiceResult
{
    public T? Data { get; private set; }

    public static ServiceResult<T> Ok(T data)
        => new() { Success = true, Data = data };

    public static new ServiceResult<T> Fail(ServiceErrorType type, string error)
        => new() { Success = false, ErrorType = type, Error = error };
}
