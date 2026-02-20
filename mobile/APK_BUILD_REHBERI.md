# APK Oluşturma Rehberi

## Önemli Notlar

✅ **VDS'de mobil uygulamayı ayağa kaldırmanıza GEREK YOK!**
- Mobil uygulama sadece backend'e bağlanır
- Backend'iniz zaten VDS'de çalışıyor
- Mobil uygulama bir sunucu değil, sadece istemci (client)

## Adım 1: API URL'ini Ayarlayın

`.env` dosyasını açın ve VDS IP adresinizi yazın:

```env
EXPO_PUBLIC_API_URL=http://YOUR_VDS_IP:5000
```

Veya domain kullanıyorsanız:
```env
EXPO_PUBLIC_API_URL=https://yourdomain.com
```

## Adım 2: Telefonunuzda Test Etmek İçin (Geliştirme)

### Seçenek A: Expo Go ile Hızlı Test (Önerilen)

1. Telefonunuza **Expo Go** uygulamasını indirin (Play Store'dan)
2. Bilgisayarınızda terminalde:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
3. QR kodu telefonunuzla tarayın (aynı WiFi ağında olmalısınız)
4. Uygulama telefonunuzda açılacak

### Seçenek B: Development Build (Daha Gerçekçi)

```bash
cd mobile
npm install
npx expo run:android
```

Bu komut telefonunuzda gerçek bir APK kurar (USB debugging açık olmalı).

## Adım 3: APK Oluşturma (Arkadaşlarınız İçin)

### Yöntem 1: EAS Build (Önerilen - Cloud'da Build)

1. **Expo hesabı oluşturun** (ücretsiz): https://expo.dev
2. **EAS CLI'yi yükleyin**:
   ```bash
   npm install -g eas-cli
   ```
3. **Giriş yapın**:
   ```bash
   eas login
   ```
4. **Build yapın**:
   ```bash
   cd mobile
   eas build --platform android --profile preview
   ```
5. Build tamamlandığında APK linkini alacaksınız, indirip arkadaşlarınıza gönderebilirsiniz.

### Yöntem 2: Local Build (Kendi Bilgisayarınızda)

**Gereksinimler:**
- Android Studio kurulu olmalı
- Java JDK kurulu olmalı
- ANDROID_HOME environment variable ayarlanmalı

**Komutlar:**
```bash
cd mobile
npm install
npx expo prebuild
npx expo run:android --variant release
```

APK şu konumda olacak:
`mobile/android/app/build/outputs/apk/release/app-release.apk`

## Adım 4: APK'yı Paylaşma

1. APK dosyasını Google Drive, Dropbox veya benzeri bir servise yükleyin
2. Arkadaşlarınıza link gönderin
3. Telefonlarında "Bilinmeyen kaynaklardan uygulama yükleme" iznini açmaları gerekebilir

## Sorun Giderme

### Backend'e bağlanamıyor
- VDS IP adresinin doğru olduğundan emin olun
- Backend'inizin VDS'de çalıştığını kontrol edin
- Firewall'un 5000 portunu açık olduğundan emin olun
- HTTPS kullanıyorsanız SSL sertifikası olmalı

### Build hatası alıyorum
- `npm install` komutunu tekrar çalıştırın
- `npx expo install --fix` komutunu deneyin
- Node.js versiyonunuzun 18+ olduğundan emin olun

## Hızlı Başlangıç (Özet)

```bash
# 1. Bağımlılıkları yükle
cd mobile
npm install

# 2. .env dosyasını düzenle (VDS IP'nizi yazın)

# 3. Telefonunuzda test için
npx expo start

# 4. APK oluşturmak için (EAS Build)
eas build --platform android --profile preview
```
