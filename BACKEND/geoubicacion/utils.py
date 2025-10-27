import hashlib
import requests
from django.conf import settings


def generar_hash_direccion(address_data):
    # Genera un hash único por dirección física exacta (con piso y depto incluidos)
    # para detectar duplicados de entregas en la misma unidad.
    base_str = f"{address_data['components'].get('route', '')} " \
        f"{address_data['components'].get('street_number', '')}, " \
        f"{address_data['components'].get('locality', '')}, " \
        f"{address_data['components'].get('administrative_area_level_1', '')}, " \
        f"{address_data['components'].get('country', '')}, " \
        f"{address_data.get('floor', '')}, {address_data.get('apartment', '')}"
    return hashlib.sha256(base_str.strip().lower().encode()).hexdigest()


def generar_hash_geoloc(address_data):

    # Genera un hash de geolocalización (sin piso ni depto) 
    # para identificar la ubicación física base (edificio, casa, etc.).

    base_str = f"{address_data['components'].get('route', '')} " \
    f"{address_data['components'].get('street_number', '')}, " \
    f"{address_data['components'].get('locality', '')}, " \
    f"{address_data['components'].get('administrative_area_level_1', '')}, " \
    f"{address_data['components'].get('country', '')}"
    return hashlib.sha256(base_str.strip().lower().encode()).hexdigest()


def obtener_coordenadas_google(formatted_address):
    # Llama a la API de Google Geocoding si no existe en cache.
    api_key = settings.GOOGLE_MAPS_API_KEY
    url = f"https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": formatted_address, "key": api_key}

    resp = requests.get(url, params=params)
    data = resp.json()

    if data["status"] != "OK" or not data["results"]:
        return None

    loc = data["results"][0]["geometry"]["location"]
    return loc["lat"], loc["lng"], data


#CODIGO VIEJO ANTES DE LA REFACTORIZACION

#                 # Hash sin piso ni depto (para geocoding/cache)
# def generar_hash_geocoding(calle, numero, ciudad, provincia, pais):
#     base = f"{calle} {numero}, {ciudad}, {provincia}, {pais}".strip().lower()
#     return hashlib.sha256(base.encode("utf-8")).hexdigest()

#             #Hash único por dirección física (diferencia deptos/pisos)
# def generar_hash_direccion(calle, numero, piso, depto, ciudad, provincia, pais):
#     detalle = f"{calle} {numero}, piso {piso or ''} depto {depto or ''}, {ciudad}, {provincia}, {pais}".strip().lower()
#     return hashlib.sha256(detalle.encode("utf-8")).hexdigest()


#             # Llama a la API de Google Geocoding para obtener lat/lon de una dirección textual.
#             # Devuelve un diccionario o None si falla.  
# def obtener_coordenadas_google(address_text):
    
#     params = {"address": address_text, "key": settings.GOOGLE_MAPS_API_KEY}
#     url = "https://maps.googleapis.com/maps/api/geocode/json"
#     response = requests.get(url, params=params)
#     data = response.json()

#     if data.get("status") == "OK" and data["results"]:
#         result = data["results"][0]
#         location = result["geometry"]["location"]
#         return {
#             "formatted_address": result["formatted_address"],
#             "lat": location["lat"],
#             "lng": location["lng"],
#             "raw": result,
#         }
#     return None
