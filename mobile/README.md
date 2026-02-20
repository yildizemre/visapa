# VISLIVIS Mobile App

React Native Expo uygulaması - iOS ve Android için.

## Kurulum

```bash
cd mobile
npm install
```

## API URL Yapılandırması

**ÖNEMLİ:** Mobilde `localhost` çalışmaz! Bilgisayarınızın IP adresini kullanmalısınız.

### IP Adresinizi Bulma

**Windows:**
```bash
ipconfig
```
IPv4 Address'i bulun (örn: `192.168.1.65`)

**Mac/Linux:**
```bash
ifconfig
# veya
ip addr
```

### API URL Ayarlama

1. `.env` dosyası oluşturun (`.env.example` dosyasını kopyalayın):
```bash
cp .env.example .env
```

2. `.env` dosyasını düzenleyin:
```
EXPO_PUBLIC_API_URL=http://192.168.1.65:5000
```
(IP adresinizi değiştirin)

3. Veya `src/lib/api.ts` dosyasındaki varsayılan değeri değiştirin:
```typescript
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.65:5000';
```

## Backend'i Başlatma

Backend'in çalıştığından emin olun:

```bash
cd ../backend
python app.py
# veya
gunicorn app:app
```

Backend `http://0.0.0.0:5000` veya `http://127.0.0.1:5000` adresinde çalışmalı.

## Çalıştırma

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Web (test için)
```bash
npm run web
```

## Login Bilgileri

Web'deki gibi aynı kullanıcı adı ve şifre ile giriş yapabilirsiniz:
- **Kullanıcı adı:** admin
- **Şifre:** admin

## Sorun Giderme

### "Network request failed" Hatası

1. Backend'in çalıştığından emin olun
2. IP adresinin doğru olduğundan emin olun
3. Mobil cihaz/simülatör ile bilgisayarın aynı WiFi ağında olduğundan emin olun
4. Firewall'un port 5000'i engellemediğinden emin olun

### Worklets Hatası

Bu hata çözüldü. Drawer navigation kaldırıldı, Stack navigation kullanılıyor.

## Yapı

- `src/screens/` - Tüm ekranlar
- `src/components/` - Reusable component'ler (Header, LoginPage, LanguageToggle)
- `src/navigation/` - Navigation yapısı (Stack Navigation)
- `src/contexts/` - Context API (Language)
- `src/lib/` - API ve utility fonksiyonları

## Özellikler

- ✅ Login/Authentication
- ✅ Stack Navigation
- ✅ Header with Menu
- ✅ Multi-language support (TR/EN)
- ✅ Dark theme
- ⏳ Dashboard (yapılacak)
- ⏳ Customer Analytics (yapılacak)
- ⏳ Staff Management (yapılacak)
- ⏳ Heatmaps (yapılacak)
- ⏳ Queue Analysis (yapılacak)
- ⏳ Report Analytics (yapılacak)
- ⏳ Settings (yapılacak)
- ⏳ Admin Users (yapılacak)
