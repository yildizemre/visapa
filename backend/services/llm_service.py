"""
Ollama ile yerel LLM entegrasyonu.
Mağaza veritabanından gerçek veri çekip, sadece bu veriye dayanarak yanıt üretir.
Çoklu kullanıcı için tek seferde bir istek (kuyruk) ile kayıp/yavaşlama önlenir.
"""
import json
import os
import threading
from datetime import datetime, timedelta

import requests

from models import db, CustomerData, QueueData, HeatmapData, SiteConfig


# Ollama ayarları (env ile override edilebilir)
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")
OLLAMA_TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "90"))

# Tek seferde bir Ollama isteği (çoklu kullanıcıda sıra kaybolmasın)
_ollama_lock = threading.Lock()


def get_retail_data_for_llm(user_ids, date_from=None, date_to=None, days=30):
    """
    Veritabanından günlük satışlar, aktif müşteri sayısı, kuyruk yoğunluğu vb.
    kritik mağaza verilerini çeker. Mock değil, gerçek DB sorgusu.
    """
    if not user_ids:
        return {"hata": "Mağaza veya kullanıcı seçilmedi."}

    end_date = date_to or datetime.utcnow()
    start_date = date_from or (end_date - timedelta(days=days))
    if hasattr(start_date, "date"):
        start_date = start_date.date()
    if hasattr(end_date, "date"):
        end_date = end_date.date()

    result = {
        "dönem": f"{start_date} — {end_date}",
        "günlük_satışlar": [],
        "toplam_satış_tutarı": 0,
        "aktif_müşteri_sayısı": 0,
        "toplam_giren": 0,
        "toplam_çıkan": 0,
        "cinsiyet_dağılımı": {"erkek": 0, "kadın": 0},
        "yaş_dağılımı": {"18-30": 0, "30-50": 0, "50+": 0},
        "kuyruk_yoğunluğu": {
            "ortalama_bekleme_süresi_saniye": 0,
            "toplam_kuyruk_kaydı": 0,
            "toplam_müşteri_kuyrukta": 0,
            "kasa_bazlı": {},
        },
        "bölge_yoğunlukları": [],
    }

    # Mağaza adı
    site = SiteConfig.query.filter(SiteConfig.user_id.in_(user_ids)).first()
    if site and site.site_name:
        result["mağaza_adı"] = site.site_name

    # Müşteri verileri (gerçek sorgu)
    customer_rows = CustomerData.query.filter(
        CustomerData.user_id.in_(user_ids),
        db.func.date(CustomerData.timestamp) >= start_date,
        db.func.date(CustomerData.timestamp) <= end_date,
    ).all()

    daily_sales = {}
    for r in customer_rows:
        d = r.timestamp.date() if r.timestamp else None
        if d:
            daily_sales[str(d)] = daily_sales.get(str(d), 0) + (getattr(r, "purchase_amount", 0) or 0)
        result["toplam_giren"] += getattr(r, "entered", 0) or 0
        result["toplam_çıkan"] += getattr(r, "exited", 0) or 0
        result["cinsiyet_dağılımı"]["erkek"] += r.male_count or 0
        result["cinsiyet_dağılımı"]["kadın"] += r.female_count or 0
        result["yaş_dağılımı"]["18-30"] += getattr(r, "age_18_30", 0) or 0
        result["yaş_dağılımı"]["30-50"] += getattr(r, "age_30_50", 0) or 0
        result["yaş_dağılımı"]["50+"] += getattr(r, "age_50_plus", 0) or 0

    result["toplam_satış_tutarı"] = sum(daily_sales.values())
    result["günlük_satışlar"] = [{"tarih": k, "tutar": v} for k, v in sorted(daily_sales.items())]
    # Aktif müşteri: dönem içinde giren veya mevcut içeride olan anlamında toplam giren kullanıyoruz
    result["aktif_müşteri_sayısı"] = result["toplam_giren"]

    # Kuyruk verileri (gerçek sorgu)
    queue_rows = QueueData.query.filter(
        QueueData.user_id.in_(user_ids),
        db.func.date(db.func.coalesce(QueueData.recorded_at, QueueData.created_at)) >= start_date,
        db.func.date(db.func.coalesce(QueueData.recorded_at, QueueData.created_at)) <= end_date,
    ).all()

    if queue_rows:
        waits = [r.wait_time for r in queue_rows if r.wait_time is not None]
        result["kuyruk_yoğunluğu"]["ortalama_bekleme_süresi_saniye"] = (
            round(sum(waits) / len(waits), 1) if waits else 0
        )
        result["kuyruk_yoğunluğu"]["toplam_kuyruk_kaydı"] = len(queue_rows)
        result["kuyruk_yoğunluğu"]["toplam_müşteri_kuyrukta"] = sum(r.total_customers or 1 for r in queue_rows)
        cashiers = {}
        for r in queue_rows:
            cid = r.cashier_id or "Belirsiz"
            cashiers[cid] = cashiers.get(cid, 0) + (r.total_customers or 1)
        result["kuyruk_yoğunluğu"]["kasa_bazlı"] = cashiers

    # Bölge yoğunlukları (heatmap)
    heatmap_rows = HeatmapData.query.filter(
        HeatmapData.user_id.in_(user_ids),
        db.func.date(db.func.coalesce(HeatmapData.date_recorded, HeatmapData.recorded_at)) >= start_date,
        db.func.date(db.func.coalesce(HeatmapData.date_recorded, HeatmapData.recorded_at)) <= end_date,
    ).all()

    zones = {}
    for r in heatmap_rows:
        z = r.zone or "Belirsiz"
        zones[z] = zones.get(z, 0) + (r.visitor_count or 0)
    result["bölge_yoğunlukları"] = [{"bölge": k, "ziyaretçi_sayısı": v} for k, v in sorted(zones.items(), key=lambda x: -x[1])]

    return result


def call_ollama(prompt, system_prompt=None):
    """
    Ollama /api/generate endpoint'ine POST atar.
    Kuyruk: sadece _ollama_lock ile korunan tek thread çağrılıyor.
    """
    full_prompt = prompt
    if system_prompt:
        full_prompt = f"{system_prompt}\n\n{prompt}"

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": full_prompt,
        "stream": False,
    }
    url = f"{OLLAMA_BASE_URL}/api/generate"
    with _ollama_lock:
        response = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
    response.raise_for_status()
    data = response.json()
    return (data.get("response") or "").strip()


def get_chat_response(user_ids, user_message, date_from=None, date_to=None, history=None):
    """
    Giriş yapan kullanıcının mağaza verisini DB'den okur, SADECE bu veriye göre cevap üretir.
    Rakam uydurmaz; veri yoksa "veritabanında bulunamadı" der. history ile önceki mesajlar verilirse
    doğal sohbet (merhaba, devam) yapar. Çoklu kullanıcıda kuyruk (lock) ile sıra korunur.
    """
    try:
        data = get_retail_data_for_llm(user_ids, date_from=date_from, date_to=date_to, days=30)
        json_data = json.dumps(data, ensure_ascii=False, indent=2)

        system_prompt = (
            "Sen Vislivis mağaza asistanısın. ÖNEMLİ: Aşağıdaki rakamlar giriş yapan kullanıcının veritabanından alınmış GERÇEK verilerdir. "
            "Sadece bu JSON'daki sayıları kullan; ASLA uydurma. Veri yoksa 'Veritabanında bu bilgi bulunamadı' de. "
            "Kısa, Türkçe, doğal sohbet tarzında cevap ver. Selamlaşma sorularına (merhaba, nasılsın) kısa karşılık ver, gereksiz rakam sayma. "
            "Mağaza için önerilerde de bulunabilirsin: kuyruk yoğunluğu, bölge dağılımı, satış ve müşteri verilerine göre kısa, uygulanabilir öneriler sun.\n\n"
            "Kullanıcının veritabanı verisi (TL, müşteri sayısı vb. sadece buradan):\n"
        ) + json_data

        user_prompt = ""
        if history:
            lines = []
            for m in history[-6:]:
                role = "Kullanıcı" if m.get("role") == "user" else "Asistan"
                lines.append(f"{role}: {m.get('content', '')}")
            user_prompt += "Önceki konuşma:\n" + "\n".join(lines) + "\n\n"

        user_prompt += f"Kullanıcı: {user_message}\n\nAsistan (kısa, Türkçe, sadece verideki rakamlara dayanarak):"
        answer = call_ollama(user_prompt, system_prompt=system_prompt)
        return answer if answer else "Cevap oluşturulamadı. Lütfen tekrar deneyin."
    except requests.exceptions.ConnectionError:
        return (
            "Ollama'ya bağlanılamıyor. Ollama'nın çalıştığından emin olun (Windows'ta Ollama uygulamasını açın veya 'ollama serve')."
        )
    except requests.exceptions.Timeout:
        return "AI yanıtı zaman aşımına uğradı. Lütfen kısa bir süre sonra tekrar deneyin."
    except requests.exceptions.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            return (
                "Ollama 404 veriyor: Model bulunamadı. Terminalde şunu çalıştırın: ollama pull qwen2.5:3b "
                "Ardından Ollama'nın açık olduğundan emin olun."
            )
        return f"AI servisi hata verdi: {str(e)}. Lütfen daha sonra tekrar deneyin."
    except requests.exceptions.RequestException as e:
        return f"AI servisi geçici olarak yanıt veremedi: {str(e)}. Lütfen daha sonra tekrar deneyin."
    except Exception as e:
        return f"Beklenmeyen bir hata oluştu: {str(e)}. Lütfen tekrar deneyin."
