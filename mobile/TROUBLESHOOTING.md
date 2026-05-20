# Troubleshooting - Worklets Hatası

Eğer Worklets hatası alırsanız:

## Çözüm 1: Cache Temizleme

```bash
# Expo cache temizle
npx expo start --clear

# Node modules temizle ve yeniden yükle
Remove-Item -Recurse -Force node_modules
npm install
```

## Çözüm 2: iOS Build Temizleme (macOS gerekli)

```bash
# iOS build klasörünü temizle
cd ios
rm -rf build
pod deintegrate
pod install
cd ..
```

## Çözüm 3: Expo Development Build

Eğer hala sorun varsa, development build kullanın:

```bash
npx expo prebuild
npx expo run:ios
```

## Not

`victory-native` paketi Worklets kullanıyor ve Expo ile uyumsuzluk yaratabiliyor. Bu yüzden kaldırıldı. Chart'lar için `react-native-chart-kit` kullanıyoruz.
