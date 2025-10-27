from collections import defaultdict
from time import timezone
from django.db import transaction
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import requests
from math import radians, sin, cos, sqrt, atan2
from RuteandoAppDev.BACKEND.usuarios.decorators import solo_gestores
from rutas.models import Ruta, PuntoRuta
from geoubicacion.models import APIGeocodingCache
from .serializers import AsignarRutaSerializer, CalcularRutaInputDireccionSerializer, CalcularRutaOutputSerializer


class CalcularRutaView(APIView):
    # Calcula una ruta óptima usando Google Routes API.
    # - Recibe direcciones físicas con hashes y coordenadas.
    # - Agrupa por hash_geoloc para no duplicar ubicaciones.
    # - Crea la Ruta y los PuntoRuta correspondientes.
    # - Devuelve la ruta optimizada + puntos + direcciones físicas asociadas.

    def post(self, request, *args, **kwargs):
        input_serializer = CalcularRutaInputDireccionSerializer(
            data=request.data.get("direcciones"), many=True
        )
        input_serializer.is_valid(raise_exception=True)
        direcciones = input_serializer.validated_data

        if not direcciones or len(direcciones) < 2:
            return Response(
                {"error": "Se necesitan al menos dos direcciones válidas para calcular una ruta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Agrupar por hash_geoloc (una sola ubicación por coordenada)
        grupos = defaultdict(list)
        for d in direcciones:
            grupos[d["hash_geoloc"]].append(d)

        puntos_unicos = []
        for hash_geo, lista in grupos.items():
            puntos_unicos.append({
                "hash_geoloc": hash_geo,
                "lat": lista[0]["latitud"],
                "lng": lista[0]["longitud"],
                "direcciones_fisicas": lista
            })

        if len(puntos_unicos) < 2:
            return Response(
                {"error": "No hay suficientes ubicaciones únicas para calcular la ruta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Construir request a Google Routes API
        api_key = settings.GOOGLE_MAPS_API_KEY
        url = "https://routes.googleapis.com/directions/v2:computeRoutes"

        origin = {
            "location": {
                "latLng": {
                    "latitude": puntos_unicos[0]["lat"],
                    "longitude": puntos_unicos[0]["lng"],
                }
            }
        }
        destination = {
            "location": {
                "latLng": {
                    "latitude": puntos_unicos[-1]["lat"],
                    "longitude": puntos_unicos[-1]["lng"],
                }
            }
        }

        waypoints = [
            {"location": {"latLng": {"latitude": p["lat"], "longitude": p["lng"]}}}
            for p in puntos_unicos[1:-1]
        ]

        request_body = {
            "origin": origin,
            "destination": destination,
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_AWARE",
            "polylineQuality": "OVERVIEW",
            "computeAlternativeRoutes": False,
            "waypoints": waypoints,
        }

        headers = {
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": (
                "routes.distanceMeters,routes.duration,"
                "routes.polyline.encodedPolyline,routes.legs"
            ),
        }

        try:
            resp = requests.post(url, json=request_body, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            return Response(
                {"error": f"Error al consultar Google Routes API: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        routes = data.get("routes", [])
        if not routes:
            return Response(
                {"error": "La API de Google no devolvió rutas válidas."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        route = routes[0]
        total_distance = route.get("distanceMeters", 0)
        total_duration = route.get("duration", 0)
        encoded_polyline = route.get("polyline", {}).get("encodedPolyline", "")
        legs = route.get("legs", [])

        # Crear Ruta y PuntoRuta
        with transaction.atomic():
            ruta = Ruta.objects.create(
                distancia_total_m=total_distance,
                duracion_total_s=total_duration,
                geometry=encoded_polyline,
                estado="pendiente"
            )

            punto_rutas_response = []
            for idx, punto in enumerate(puntos_unicos, start=1):
                geocache = APIGeocodingCache.objects.filter(
                    hash_geoloc=punto["hash_geoloc"]
                ).first()

                punto_ruta = PuntoRuta.objects.create(
                    ruta=ruta,
                    geocoding_cache=geocache,
                    orden=idx,
                    distancia_prev=(legs[idx - 1].get("distanceMeters") if idx - 1 < len(legs) else None),
                    duracion_prev=(legs[idx - 1].get("duration") if idx - 1 < len(legs) else None),
                    fue_visitada=False,
                )

                punto_rutas_response.append({
                    "punto_ruta_id": punto_ruta.id,
                    "orden": idx,
                    "hash_geoloc": punto["hash_geoloc"],
                    "direcciones_fisicas": punto["direcciones_fisicas"],
                })

        # Respuesta al frontend
        output_data = {
            "ruta_id": ruta.id,
            "distancia_total_m": total_distance,
            "duracion_total_s": total_duration,
            "encoded_polyline": encoded_polyline,
            "puntos_ruta": punto_rutas_response,
        }

        output_serializer = CalcularRutaOutputSerializer(output_data)
        return Response(output_serializer.data, status=status.HTTP_200_OK)


from usuarios.decorators import solo_gestores
from usuarios.models import GestorConductor, Usuario
from rutas.models import Ruta
from .serializers import AsignarRutaSerializer
from django.utils import timezone
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

class AsignarRutaView(APIView):
    # Permite al Gestor asignar una ruta a un Conductor vinculado.
    # Valida que:
    #   - El usuario autenticado tenga rol Gestor y suscripción activa.
    #   - El conductor esté vinculado al gestor (GestorConductor.es_active=True).
    #   - La ruta no esté ya asignada.

    @solo_gestores
    def post(self, request):
        user = request.user  # Gestor autenticado
        serializer = AsignarRutaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ruta = serializer.validated_data["ruta"]
        conductor = serializer.validated_data["conductor"]

        # Validar vínculo Gestor–Conductor
        if not GestorConductor.objects.filter(
            gestor=user, conductor=conductor, es_active=True
        ).exists():
            return Response(
                {"error": "No puedes asignar rutas a un conductor no vinculado."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar si la ruta ya está asignada
        if ruta.asignada_a:
            if ruta.asignada_a == conductor:
                return Response(
                    {"detalle": "La ruta ya está asignada a este conductor."},
                    status=status.HTTP_200_OK
                )
            return Response(
                {"error": "La ruta ya está asignada a otro conductor."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Asignar ruta
        ruta.asignada_a = conductor
        ruta.estado = "asignada"
        ruta.fecha_asignacion = timezone.now()
        ruta.solo_lectura = True
        ruta.creada_por = user  # Para registrar quién la asignó
        ruta.save()

        return Response({
            "mensaje": f"Ruta {ruta.id} asignada correctamente a {conductor.username}.",
            "ruta_id": ruta.id,
            "conductor_id": conductor.id,
            "asignada_por": user.username,
            "fecha_asignacion": ruta.fecha_asignacion
        }, status=status.HTTP_200_OK)


##########################################################################################
# Verificar Proximidad al Punto de Ruta
# Calcular distancia entre dos puntos GPS usando la fórmula Haversine
def distancia_metros(lat1, lon1, lat2, lon2):
    R = 6371000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

PROXIMIDAD_METROS = getattr(settings, "ENTREGA_PROXIMIDAD_METROS", 50)
class ProximidadPuntoRutaView(APIView):
    # Verifica si el conductor está cerca del siguiente punto de entrega de una ruta en curso.
    # Retorna la distancia en metros y si está dentro del rango definido.

    def post(self, request):
        ruta_id = request.data.get("ruta_id")
        ubicacion_gps = request.data.get("ubicacion_gps")

        if not ruta_id or not ubicacion_gps:
            return Response(
                {"error": "Se requiere ruta_id y ubicación GPS."},
                status=status.HTTP_400_BAD_REQUEST
            )

        lat_conductor = ubicacion_gps.get("lat")
        lon_conductor = ubicacion_gps.get("lng")

        if lat_conductor is None or lon_conductor is None:
            return Response(
                {"error": "La ubicación GPS debe incluir lat y lng."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar ruta en curso
        try:
            ruta = Ruta.objects.get(id=ruta_id, estado="en_curso")
        except Ruta.DoesNotExist:
            return Response(
                {"error": "Ruta no encontrada o no está en curso."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Buscar el siguiente punto no visitado
        punto = ruta.puntoruta_set.filter(fue_visitada=False).order_by("orden").first()
        if not punto:
            return Response(
                {"mensaje": "Ruta completada. No quedan puntos pendientes."},
                status=status.HTTP_200_OK
            )

        # Calcular distancia
        lat_punto = float(punto.geocoding_cache.latitud)
        lon_punto = float(punto.geocoding_cache.longitud)
        distancia_m = calcular_distancia(lat_conductor, lon_conductor, lat_punto, lon_punto)

        # Verificar si está dentro del rango
        dentro_del_rango = distancia_m <= PROXIMIDAD_METROS

        # Si está dentro del rango, se podría marcar automáticamente como visitado (opcional)
        if dentro_del_rango and not punto.fue_visitada:
            punto.fue_visitada = True
            punto.save(update_fields=["fue_visitada"])

        return Response({
            "punto_ruta_id": punto.id,
            "orden": punto.orden,
            "distancia_metros": round(distancia_m, 2),
            "dentro_del_rango": dentro_del_rango,
            "umbral_metros": PROXIMIDAD_METROS,
            "mensaje": (
                "Dentro del rango, puede registrar la entrega."
                if dentro_del_rango
                else "Aún estás lejos del punto de entrega."
            )
        }, status=status.HTTP_200_OK)