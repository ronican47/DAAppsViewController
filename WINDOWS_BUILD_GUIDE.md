# WhatGram Windows Desktop Uygulaması - Kurulum Rehberi

## 🎯 Hazırlanan Uygulama

**WhatGram Windows Desktop App** - Electron ile paketlenmiş masaüstü uygulaması

### ✅ Özellikler:
- 📦 Otomatik kurulum (.exe installer)
- 🖥️ Portable versiyon (kurulum gerektirmez)
- 🔔 Windows bildirimleri
- 🎯 Başlat menüsü ve masaüstü kısayolu
- 🔄 Arka planda çalışma (system tray)
- 💾 Offline çalışma desteği
- 🚀 Hızlı başlatma

---

## 📋 Gereksinimler (Build için)

1. **Node.js** (v16 veya üzeri): https://nodejs.org
2. **Yarn** package manager: `npm install -g yarn`
3. **Windows** veya **macOS** veya **Linux** (build için)
4. **Git** (opsiyonel): https://git-scm.com

---

## 🚀 Hızlı Başlangıç

### 1. Projeyi Hazırla

```bash
cd /app/frontend
yarn install
```

### 2. Test Et (Geliştirme Modu)

```bash
yarn electron-dev
```

Bu komut:
- React uygulamasını başlatır (port 3000)
- Electron penceresi açar
- Hot reload aktif olur
- DevTools açık gelir

### 3. Windows .exe Oluştur

```bash
yarn electron-build
```

**Çıktılar** (`/app/frontend/dist-electron/` klasörü):
- ✅ `WhatGram-Setup-1.0.0.exe` (~150MB) - Kurulum dosyası
- ✅ `WhatGram-Portable-1.0.0.exe` (~150MB) - Portable versiyon
- ✅ `latest.yml` - Auto-update bilgileri

---

## 📦 Build Komutları

### Windows için Build
```bash
yarn electron-build
```

### Tüm Platformlar için Build
```bash
yarn electron-build-all
```

Bu komut şunları oluşturur:
- **Windows**: `.exe` (installer + portable)
- **macOS**: `.dmg` + `.zip`
- **Linux**: `.AppImage` + `.deb` + `.rpm`

### Sadece Paket (Test için)
```bash
yarn pack
```

Bu, kurulum dosyası oluşturmadan sadece paketler (daha hızlı).

---

## 🎨 Icon Dosyaları Hazırlama

### Gerekli Icon Formatları:

**Windows**: `icon.ico` (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
**macOS**: `icon.icns` (512x512, 256x256, 128x128, 64x64, 32x32, 16x16)
**Linux**: `icon.png` (512x512)

### Icon Oluşturma:

#### Option 1: Online Tool (En Kolay)
1. https://www.icoconverter.com/ adresine git
2. PNG logonuzu yükle (en az 512x512)
3. `.ico` formatında indir
4. `/app/frontend/build-resources/icon.ico` olarak kaydet

#### Option 2: ImageMagick (Komut satırı)
```bash
# PNG'den ICO oluştur
convert icon-512.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico

# macOS için ICNS oluştur
mkdir icon.iconset
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 64 64 icon.png --out icon.iconset/icon_64x64.png
sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png
sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
iconutil -c icns icon.iconset
```

### Icon Yerleşimi:
```
/app/frontend/
├── build-resources/
│   ├── icon.ico      # Windows icon
│   ├── icon.icns     # macOS icon
│   └── icon.png      # Linux icon
└── public/
    └── icon.png      # Uygulama içi icon
```

---

## 🔧 Konfigürasyon

### Backend URL Değiştirme

`/app/frontend/.env` dosyasını düzenle:

```env
REACT_APP_BACKEND_URL=https://your-backend-url.com
WDS_SOCKET_PORT=443
```

Sonra yeniden build et:
```bash
yarn build
yarn electron-build
```

### Versiyon Güncelleme

`/app/frontend/package.json` dosyasında:
```json
{
  "name": "frontend",
  "version": "1.0.0",  // <-- Burası
  "productName": "WhatGram"
}
```

Her build'de version numarasını artır (1.0.1, 1.0.2, vb.)

---

## 📁 Proje Yapısı

```
/app/frontend/
├── public/
│   ├── electron.js              # Electron ana dosyası
│   └── index.html
├── src/
│   ├── App.js                   # React uygulaması
│   └── ...
├── build-resources/             # Build kaynakları
│   ├── icon.ico                 # Windows icon
│   ├── icon.icns                # macOS icon
│   └── icon.png                 # Linux icon
├── dist-electron/               # Build çıktıları
│   ├── win-unpacked/            # Unpacked Windows dosyaları
│   ├── WhatGram-Setup-1.0.0.exe # Kurulum dosyası
│   └── WhatGram-Portable-1.0.0.exe # Portable versiyon
├── electron-builder.json        # Build konfigürasyonu
├── package.json                 # Dependencies & scripts
└── LICENSE.txt                  # Lisans dosyası
```

---

## 🎯 Kurulum Dosyası Özellikleri

### WhatGram-Setup-1.0.0.exe

**Kurulum Seçenekleri:**
- ✅ Kurulum dizini seçimi
- ✅ Masaüstü kısayolu
- ✅ Başlat menüsü kısayolu
- ✅ Otomatik başlatma (opsiyonel)
- ✅ Kaldırma seçeneği

**Kurulum Sonrası:**
- Program Files klasörüne kurulur
- Başlat menüsünde görünür
- Masaüstünde ikon oluşturulur
- Windows kayıt defterine eklenir
- Kaldırma programı oluşturulur

### WhatGram-Portable-1.0.0.exe

**Portable Özellikleri:**
- ✅ Kurulum gerektirmez
- ✅ USB sürücüden çalışır
- ✅ Ayarlar exe ile birlikte saklanır
- ✅ Kayıt defteri kullanmaz
- ✅ Windows'a yazı yazmaz

---

## 🧪 Test Etme

### Geliştirme Testi
```bash
yarn electron-dev
```

### Build Testi
```bash
# Build oluştur
yarn electron-build

# Kurulum dosyasını test et
cd dist-electron
./WhatGram-Setup-1.0.0.exe
```

### Test Checklist:
- [ ] Uygulama başlıyor mu?
- [ ] Authentication çalışıyor mu?
- [ ] Unified Inbox yükleniyor mu?
- [ ] Platform tabs çalışıyor mu?
- [ ] Messaging çalışıyor mu?
- [ ] System tray çalışıyor mu?
- [ ] Bildirimler çalışıyor mu?
- [ ] Offline mode çalışıyor mu?
- [ ] Pencere boyutları doğru mu?
- [ ] Icon doğru görünüyor mu?

---

## 🐛 Sorun Giderme

### Build Hataları

**Hata**: `Cannot find module 'electron'`
```bash
cd /app/frontend
yarn add --dev electron electron-builder
```

**Hata**: `Icon file not found`
```bash
# Icon dosyalarını oluştur ve yerleştir
# /app/frontend/build-resources/ klasörüne
```

**Hata**: `ENOENT: no such file or directory, open 'build/index.html'`
```bash
# Önce React build'i yap
yarn build
# Sonra Electron build
yarn electron-build
```

### Çalışma Zamanı Hataları

**Sorun**: Uygulama açılmıyor
- Backend URL'yi kontrol et (.env)
- Konsol loglarına bak (DevTools)
- Electron loglarını kontrol et

**Sorun**: Beyaz ekran
- `yarn build` yapıldı mı kontrol et
- `homepage: "./"` package.json'da var mı kontrol et
- DevTools'da hata var mı bak

**Sorun**: Backend'e bağlanamıyor
- Backend çalışıyor mu kontrol et
- CORS ayarları doğru mu kontrol et
- Network tab'da isteklere bak

---

## 📤 Dağıtım

### 1. Dosyaları Hazırla

```bash
cd /app/frontend
yarn electron-build
cd dist-electron
```

### 2. Dosyaları Test Et

Windows bilgisayarda:
- `WhatGram-Setup-1.0.0.exe` dosyasını çalıştır
- Kurulumu tamamla
- Uygulamayı test et

### 3. Dağıtım Seçenekleri

**Option A: Direct Download**
- `.exe` dosyasını web sitenize yükle
- Download linki oluştur

**Option B: GitHub Releases**
```bash
# GitHub'a yükle
git tag v1.0.0
git push origin v1.0.0
# GitHub Releases'da .exe dosyasını ekle
```

**Option C: Microsoft Store**
- Microsoft Partner Center'a üye ol
- Uygulama paketi oluştur (APPX)
- Store'a submit et

---

## 🔄 Auto-Update

Otomatik güncelleme için electron-updater kullanılabilir:

```bash
yarn add electron-updater
```

`electron.js` dosyasına ekle:
```javascript
const { autoUpdater } = require('electron-updater');

app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify();
});
```

Update sunucusu gerekir (GitHub Releases kullanılabilir).

---

## 📊 Build Süresi ve Boyut

**Build Süresi**:
- İlk build: ~5-10 dakika
- Sonraki build'ler: ~2-3 dakika

**Dosya Boyutları**:
- Setup.exe: ~150-180 MB
- Portable.exe: ~150-180 MB
- Unpacked klasör: ~300-350 MB

**Build Gereksinimleri**:
- Disk alanı: En az 2 GB
- RAM: En az 4 GB
- CPU: Herhangi bir modern CPU

---

## 🎓 Örnekler

### Basit Test
```bash
cd /app/frontend
yarn install
yarn electron-dev
```

### Production Build
```bash
cd /app/frontend
yarn install
yarn build
yarn electron-build
```

### Build + Test
```bash
cd /app/frontend
yarn install
yarn build
yarn electron-build
cd dist-electron
start WhatGram-Setup-1.0.0.exe
```

---

## 📝 Notlar

- Icon dosyaları yoksa build hata verir - mutlaka oluştur!
- İlk build uzun sürer (dependencies indirilir)
- Backend URL doğru olmalı yoksa uygulama çalışmaz
- Windows Defender .exe dosyasını tarayabilir (normal)
- Code signing yapılmazsa "Unknown Publisher" uyarısı çıkar

---

## ✅ Build Checklist

Build yapmadan önce:
- [ ] `yarn install` yapıldı mı?
- [ ] Backend URL `.env` dosyasında doğru mu?
- [ ] Icon dosyaları `build-resources/` klasöründe mi?
- [ ] `LICENSE.txt` dosyası var mı?
- [ ] Version numarası güncellendi mi?
- [ ] `yarn build` başarılı mı?

Build sonrası:
- [ ] `dist-electron/` klasöründe .exe var mı?
- [ ] Setup.exe çalışıyor mu?
- [ ] Portable.exe çalışıyor mu?
- [ ] Uygulama tüm özellikler çalışıyor mu?
- [ ] Icon doğru görünüyor mu?

---

## 🚀 Şimdi Ne Yapmalı?

1. **Icon Dosyalarını Hazırla**
   - 512x512 PNG logo oluştur
   - Online tool ile .ico'ya çevir
   - `build-resources/` klasörüne koy

2. **İlk Build'i Yap**
   ```bash
   cd /app/frontend
   yarn electron-build
   ```

3. **Test Et**
   ```bash
   cd dist-electron
   start WhatGram-Setup-1.0.0.exe
   ```

4. **Dağıt**
   - .exe dosyasını kullanıcılara paylaş
   - Veya web sitende download link oluştur

---

## 📞 Destek

**Build Sorunları**: 
- Loglara bak: `yarn electron-build --verbose`
- GitHub Issues kontrol et
- Electron Builder dokümantasyonu: https://www.electron.build

**Çalışma Sorunları**:
- DevTools'u aç (Ctrl+Shift+I)
- Console tab'a bak
- Network tab'ı kontrol et

---

🎉 **WhatGram Windows Desktop uygulamanız hazır!**

Başarılar dileriz! 🚀
