from rest_framework import serializers
from .models import Direccion, PuntoUbicacion, APIGeocodingCache
from .utils import generar_hash_geocoding, generar_hash_direccion


class DireccionSerializer(serializers.ModelSerializer):
    piso = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    depto = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = Direccion
        fields = "__all__"


class DireccionInputSerializer(serializers.Serializer):
    address = serializers.DictField()
    floor = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    apartment = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)

class DireccionOutputSerializer(serializers.ModelSerializer):
    latitud = serializers.SerializerMethodField()
    longitud = serializers.SerializerMethodField()
    hash_geoloc = serializers.SerializerMethodField()
    cantidad_paquetes = serializers.SerializerMethodField()
    class Meta:
        model = Direccion
        fields = [
            "id",
            "texto_normalizado",
            "latitud",
            "longitud",
            "piso",
            "depto",
            "hash_direccion",
            "hash_geoloc",
            "cantidad_paquetes",
        ]

    def get_latitud(self, obj):
        return getattr(obj.geocoding_cache, "latitud", None)

    def get_longitud(self, obj):
        return getattr(obj.geocoding_cache, "longitud", None)

    def get_hash_geoloc(self, obj):
        return getattr(obj.geocoding_cache, "hash_geoloc", None)

    def get_cantidad_paquetes(self, obj):
        # Usamos el valor calculado en la view, no dependemos de Entrega aún
        return getattr(obj, "cantidad_paquetes", 1)

class PuntoUbicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PuntoUbicacion
        fields = "__all__"


class APIGeocodingCacheSerializer(serializers.ModelSerializer):
    class Meta:
        model = APIGeocodingCache
        fields = "__all__"
