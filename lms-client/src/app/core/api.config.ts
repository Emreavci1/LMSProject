// Backend API'nin adresi — tek yerden yönetilir.
// Sabit "localhost" yerine sayfanın açıldığı adres kullanılır: böylece
// hem kendi makinende (localhost:4200) hem ağdaki başka bir bilgisayardan
// (http://192.168.x.x:4200) açıldığında API doğru makinede bulunur.
export const API_URL = `http://${window.location.hostname}:5091/api`;
