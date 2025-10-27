from collections import defaultdict
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Direccion, APIGeocodingCache
from .serializers import DireccionOutputSerializer
from .utils import generar_hash_direccion, generar_hash_geoloc, obtener_coordenadas_google


class CargarDireccionesView(APIView):
    # Recibe direcciones desde el frontend, genera hashes, detecta duplicadas,
    # obtiene coordenadas (usando cache o API de Google), crea los registros 
    # necesarios y devuelve todas las direcciones geolocalizadas al frontend.

    def post(self, request, *args, **kwargs):
        data = request.data.get("direcciones", [])
        if not data:
            return Response({"error": "No se enviaron direcciones."},status=status.HTTP_400_BAD_REQUEST)

        direcciones_agrupadas = defaultdict(lambda: {"entries": [], "packages": 0})
        for entry in data:
            address_data = entry.get("address", {})
            if not address_data:
                continue

            floor = entry.get("floor")
            apartment = entry.get("apartment")
            packages = int(entry.get("packages", 1))

            # Generar hashes
            hash_dir = generar_hash_direccion({**address_data, "floor": floor, "apartment": apartment})
            hash_geo = generar_hash_geoloc(address_data)

            # Agrupar direcciones repetidas en el mismo request
            direcciones_agrupadas[hash_dir]["entries"].append(entry)
            direcciones_agrupadas[hash_dir]["packages"] += packages
            direcciones_agrupadas[hash_dir]["hash_geoloc"] = hash_geo

        direcciones_respuesta = []
        errores = []

        with transaction.atomic():
            for hash_dir, info in direcciones_agrupadas.items():
                entry = info["entries"][0]
                address_data = entry["address"]
                floor = entry.get("floor")
                apartment = entry.get("apartment")
                hash_geo = info["hash_geoloc"]
                cantidad_paquetes = info["packages"]

                # Buscar o crear cache geocodificado
                geocache = APIGeocodingCache.objects.filter(hash_geoloc=hash_geo).first()
                if not geocache:
                    try:
                        lat, lng, data_api = obtener_coordenadas_google(address_data["formatted_address"])
                        geocache = APIGeocodingCache.objects.create(
                            hash_geoloc=hash_geo,
                            latitud=lat,
                            longitud=lng,
                            raw_response=data_api
                        )
                    except Exception as e:
                        errores.append(f"Error obteniendo coordenadas de {address_data['formatted_address']}: {e}")
                        continue

                # Buscar o crear Dirección (física única)
                direccion, creada = Direccion.objects.get_or_create(
                    hash_direccion=hash_dir,
                    defaults={
                        "geocoding_cache": geocache,
                        "calle": address_data["components"].get("route", ""),
                        "numero": address_data["components"].get("street_number", ""),
                        "piso": floor or None,
                        "depto": apartment or None,
                        "ciudad": address_data["components"].get("locality", ""),
                        "provincia": address_data["components"].get("administrative_area_level_1", ""),
                        "pais": address_data["components"].get("country", ""),
                        "codigo_postal": address_data["components"].get("postal_code", ""),
                        "texto_normalizado": address_data.get("formatted_address", "")
                    }
                )

                # Cargar temporalmente la cantidad de paquetes detectada
                direccion.cantidad_paquetes = cantidad_paquetes
                direcciones_respuesta.append(direccion)

        serializer = DireccionOutputSerializer(direcciones_respuesta, many=True)
        return Response({
            "direcciones": serializer.data,
            "errores": errores
        }, status=status.HTTP_200_OK)


