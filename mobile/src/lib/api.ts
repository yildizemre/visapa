import AsyncStorage from '@react-native-async-storage/async-storage';

// Mobilde localhost çalışmaz, bilgisayarın IP adresini kullanın
// Örnek: http://192.168.1.100:5000
// Veya .env dosyasında EXPO_PUBLIC_API_URL=http://YOUR_IP:5000 şeklinde ayarlayın
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.100:5000';

async function getToken(): Promise<string> {
  return (await AsyncStorage.getItem('token'))?.trim() || '';
}

export async function getSelectedStoreId(): Promise<string | null> {
  return await AsyncStorage.getItem('selectedStoreId');
}

export function apiUrl(path: string, params?: Record<string, string>): string {
  const base = API_BASE;
  const url = new URL(path.startsWith('http') ? path : path.startsWith('/') ? base + path : base + '/' + path);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.href;
}

// Backend bağlantısını test et
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    // Basit bir GET isteği ile bağlantıyı test et
    const testUrl = `${API_BASE}/api/health/status`;
    console.log('Testing connection to:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Timeout için signal ekle (React Native'de çalışmayabilir ama deneyelim)
    });
    
    // Herhangi bir yanıt alırsak backend çalışıyor demektir
    if (response.status === 401) {
      // 401 = JWT gerekiyor ama backend çalışıyor
      return { success: true, message: 'Backend bağlantısı başarılı!' };
    }
    
    if (response.ok) {
      return { success: true, message: 'Backend bağlantısı başarılı!' };
    } else {
      return { success: true, message: `Backend yanıt verdi (${response.status})` };
    }
  } catch (error: any) {
    const errorMsg = error?.message || 'Bilinmeyen hata';
    return { 
      success: false, 
      message: `Backend'e bağlanılamıyor!\n\nHata: ${errorMsg}\n\nKontrol edin:\n1. Backend çalışıyor mu?\n   cd backend && python app.py\n2. IP adresi doğru mu?\n   Şu anki: ${API_BASE}\n   Bilgisayarınızın IP'sini kontrol edin:\n   Windows: ipconfig\n   Mac/Linux: ifconfig\n3. Cihaz ve bilgisayar aynı WiFi ağında mı?\n4. Firewall backend'i engelliyor mu?` 
    };
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  try {
    const token = await getToken();
    const url = apiUrl(path);
    const storeId = await getSelectedStoreId();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    // Store ID'yi query parametresi olarak ekle
    const finalUrl = new URL(url);
    if (storeId && !finalUrl.searchParams.has('store_id')) {
      finalUrl.searchParams.set('store_id', storeId);
    }
    
    console.log('API Request:', finalUrl.href);
    
    const response = await fetch(finalUrl.href, { 
      ...options, 
      headers,
    });
    
    return response;
  } catch (error: any) {
    // Network hatası durumunda daha açıklayıcı hata mesajı
    if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
      const errorMsg = `API sunucusuna bağlanılamıyor.\n\nLütfen şunları kontrol edin:\n1. API URL: ${API_BASE}\n2. Backend sunucusu çalışıyor mu?\n3. Cihaz ve bilgisayar aynı ağda mı?`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    throw error;
  }
}
