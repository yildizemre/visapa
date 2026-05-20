# Projeyi GitHub'a Atma – Adım Adım

Bu projeyi GitHub'a sen atacaksın. Aşağıdakileri sırayla yap.

---

## 1. GitHub hesabı

- Hesabın yoksa: https://github.com → **Sign up**
- Varsa: https://github.com → **Sign in**

---

## 2. Yeni repo oluştur

1. Sağ üst **+** → **New repository**
2. **Repository name:** `panel` (veya `vislivis-panel` – ne istersen)
3. **Public** seç
4. **"Add a README"** işaretleme, **.gitignore** ekleme (bizde zaten var)
5. **Create repository** tıkla

Açılan sayfada bir URL göreceksin, örneğin:
`https://github.com/KULLANICI_ADIN/panel.git`

---

## 3. Bilgisayarında proje klasöründe Git’i aç

**PowerShell** veya **Cursor içinde Terminal** aç. Proje klasörüne git:

```powershell
cd C:\Users\Fahrihan\Desktop\panel\panel
```

Git kurulu mu kontrol et:

```powershell
git --version
```

Yoksa buradan kur: https://git-scm.com/download/win

---

## 4. Repo’yu başlat ve ilk commit

Sırayla şunları yaz (tek tek Enter’a bas):

```powershell
git init
git add .
git status
```

`git status` ile eklenen dosyalara bak. `node_modules`, `.env` görünmemeli (.gitignore sayesinde). Sonra:

```powershell
git commit -m "Panel projesi - backend, frontend, VDS kurulum"
```

---

## 5. GitHub’daki repo’ya bağlan ve at

GitHub’da oluşturduğun reponun sayfasında **yeşil "Code"** butonuna tıkla. **HTTPS** seçili olsun, URL’i kopyala. Örnek: `https://github.com/Fahrihan/panel.git`

**KULLANICI_ADIN** ve **repo adını** kendi URL’inle değiştir. Sonra:

```powershell
git remote add origin https://github.com/KULLANICI_ADIN/panel.git
git branch -M main
git push -u origin main
```

`KULLANICI_ADIN` ve `panel` kısmını kendi GitHub kullanıcı adın ve repo adınla değiştir.

Şifre / token sorarsa:
- Eski şifre artık geçersiz. **Personal Access Token** kullanman gerekir.
- GitHub → Sağ üst profil → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**. Repo yetkisi ver, token’ı kopyala.
- `git push` şifre sorduğunda **kullanıcı adını** GitHub kullanıcı adın, **şifre** yerine **token**ı yapıştır.

---

## 6. VDS’te projeyi GitHub’dan çekmek

Sunucuda artık projeyi şöyle alırsın:

```bash
ssh -p 25416 root@31.40.199.64
```

Bağlandıktan sonra:

```bash
apt-get update && apt-get install -y git
mkdir -p /var/www/vislivis
cd /var/www/vislivis
git clone https://github.com/KULLANICI_ADIN/panel.git .
```

Son satırdaki URL’i kendi repo URL’inle değiştir. Sondaki boşluk ve nokta (`.`) önemli – dosyalar doğrudan `/var/www/vislivis` içine iner.

Sonra kurulumu çalıştır:

```bash
cd /var/www/vislivis
sudo PANEL_DOMAIN=srv.xfjvcu-vulut.com ADMIN_PASS=GucluSifre bash install.sh
```

---

## Özet

| Nerede | Ne yapıyorsun |
|--------|----------------|
| GitHub.com | Yeni repo oluştur (panel veya vislivis-panel) |
| PC’nde panel klasörü | `git init` → `git add .` → `git commit` → `git remote add origin ...` → `git push` |
| VDS | `git clone https://github.com/KULLANICI_ADIN/panel.git .` → `install.sh` |

Takıldığın yeri (örn. "push yaparken şifre istiyor", "clone çalışmıyor") yazarsan oraya göre netleştiririz.
