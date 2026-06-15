from flask import Blueprint, request, jsonify
import urllib.request
import urllib.parse
import json
from datetime import datetime

weather_bp = Blueprint('weather', __name__)

# WMO weather code -> condition mapping
def _wmo_to_condition(code):
    if code == 0:
        return 'sunny'
    elif code in (1, 2, 3):
        return 'cloudy'
    elif code in (45, 48):
        return 'foggy'
    elif code in (51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82):
        return 'rainy'
    elif code in (71, 73, 75, 77, 85, 86):
        return 'snowy'
    elif code in (95, 96, 99):
        return 'stormy'
    return 'cloudy'

DAY_NAMES_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

@weather_bp.route('/forecast', methods=['GET'])
def forecast():
    lat = request.args.get('lat', '41.0082')  # Istanbul default
    lon = request.args.get('lon', '28.9784')
    try:
        url = (
            f'https://api.open-meteo.com/v1/forecast'
            f'?latitude={lat}&longitude={lon}'
            f'&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum'
            f'&current_weather=true'
            f'&timezone=Europe%2FIstanbul'
            f'&forecast_days=7'
        )
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read())

        current = data.get('current_weather', {})
        daily = data.get('daily', {})
        dates = daily.get('time', [])
        codes = daily.get('weathercode', [])
        max_temps = daily.get('temperature_2m_max', [])
        min_temps = daily.get('temperature_2m_min', [])
        precip = daily.get('precipitation_sum', [])

        # Yagmurlu gun var mi?
        is_rain_expected = False
        next_rainy_day = None
        for i, code in enumerate(codes):
            if _wmo_to_condition(code) in ('rainy', 'stormy'):
                is_rain_expected = True
                next_rainy_day = dates[i] if i < len(dates) else None
                break

        forecast_list = []
        for i in range(len(dates)):
            d = datetime.strptime(dates[i], '%Y-%m-%d')
            forecast_list.append({
                'day': DAY_NAMES_TR[d.weekday()],
                'date': dates[i],
                'temp_max': max_temps[i] if i < len(max_temps) else None,
                'temp_min': min_temps[i] if i < len(min_temps) else None,
                'temp': round((max_temps[i] + min_temps[i]) / 2) if i < len(max_temps) else None,
                'precip': precip[i] if i < len(precip) else 0,
                'cond': _wmo_to_condition(codes[i]) if i < len(codes) else 'cloudy',
            })

        return jsonify({
            'temperature': current.get('temperature', 0),
            'condition': _wmo_to_condition(int(current.get('weathercode', 0))),
            'windspeed': current.get('windspeed', 0),
            'isRainExpected': is_rain_expected,
            'nextRainyDay': next_rainy_day,
            'forecast': forecast_list,
            'lat': lat,
            'lon': lon,
        })
    except Exception as e:
        return jsonify({
            'temperature': 20,
            'condition': 'cloudy',
            'isRainExpected': False,
            'nextRainyDay': None,
            'forecast': [],
            'error': str(e)
        })


@weather_bp.route('/location-search', methods=['GET'])
def location_search():
    """Open-Meteo Geocoding API ile sehir arama - API key gerekmez."""
    q = request.args.get('q', '')
    if not q or len(q) < 2:
        return jsonify({'results': []})
    try:
        url = f'https://geocoding-api.open-meteo.com/v1/search?name={urllib.parse.quote(q)}&count=5&language=tr&format=json'
        with urllib.request.urlopen(url, timeout=5) as resp:
            data = json.loads(resp.read())
        results = []
        for r in data.get('results', []):
            results.append({
                'name': r.get('name', ''),
                'country': r.get('country', ''),
                'admin1': r.get('admin1', ''),
                'lat': r.get('latitude'),
                'lon': r.get('longitude'),
            })
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'results': [], 'error': str(e)})
