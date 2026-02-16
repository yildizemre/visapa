# Panel Kurulumu – srv.xfjvcu-vulut.com

Bu dosya sunucunuza özel kısa kurulum notudur. **Şifrenizi bu dosyaya veya başka bir yere yazmayın.**

---

## Sunucu bilgileri

| Bilgi        | Değer |
|-------------|--------|
| Hostname    | srv.xfjvcu-vulut.com |
| IP          | 31.40.199.64 |
| SSH port    | 25416 |
| Kullanıcı   | root |

---

## 1. Bilgisayarınızdan SSH ile bağlanın

```bash
ssh -p 25416 root@31.40.199.64
```

Şifre sorulduğunda sunucu şifrenizi girin.

---

## 2. Projeyi sunucuya gönderin (kendi bilgisayarınızda)

Panel projesi `c:\Users\Fahrihan\Desktop\panel\panel` klasöründe. Bağlantıyı kapattıktan sonra **kendi PC’nizde** (PowerShell veya WSL) proje dizinindeyken:

```bash
cd c:\Users\Fahrihan\Desktop\panel\panel
scp -P 25416 -r . root@31.40.199.64:/var/www/vislivis
```

Önce sunucuda dizin yoksa SSH ile bağlanıp oluşturun:

```bash
ssh -p 25416 root@31.40.199.64 "mkdir -p /var/www/vislivis"
```

Sonra tekrar `scp` komutunu çalıştırın.

**Not:** `node_modules` büyükse, sunucuda kurulum yapmak daha iyidir. O zaman sadece proje kaynak dosyalarını gönderin (node_modules ve venv hariç); kurulum scripti zaten `npm install` ve `pip install` yapacaktır.

---

## 3. Sunucuda kurulum (SSH ile bağlıyken)

```bash
ssh -p 25416 root@31.40.199.64
```

Bağlandıktan sonra:

```bash
# Domain olarak hostname kullanıyoruz (SSL için uygun)
# Admin şifresini kendiniz belirleyin (örnek: Panel2025!)
cd /var/www/vislivis
sudo PANEL_DOMAIN=srv.xfjvcu-vulut.com ADMIN_PASS=Panel2025! bash install.sh
```

`ADMIN_PASS=...` kısmını kendi güçlü şifrenizle değiştirin.

---

## 4. Erişim

- Panel: **http://srv.xfjvcu-vulut.com** veya **http://31.40.199.64**
- Admin giriş: kullanıcı **admin**, şifre kurulumda yazdığınız `ADMIN_PASS`

Domain’in 31.40.199.64’e yönlendiğinden emin olun (DNS A kaydı).

---

## 5. SSL (HTTPS) – isteğe bağlı

Domain doğru yönleniyorsa:

```bash
ssh -p 25416 root@31.40.199.64
sudo certbot --nginx -d srv.xfjvcu-vulut.com
```

Sonrasında panel: **https://srv.xfjvcu-vulut.com**

---

## Güvenlik

- Root şifrenizi kimseyle paylaşmayın; mümkünse SSH key kullanın.
- Kurulumdan sonra admin panel şifresini değiştirmek için sunucuda:  
  `cd /var/www/vislivis && source venv/bin/activate && cd backend && python3 create_admin.py --username admin --password YeniGucluSifre`
