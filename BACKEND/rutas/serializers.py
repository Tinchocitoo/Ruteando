from rest_framework import serializers
from RuteandoAppDev.BACKEND.rutas.models import Ruta
from RuteandoAppDev.BACKEND.usuarios.models import Usuario

class CalcularRutaInputDireccionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    texto_normalizado = serializers.CharField()
    latitud = serializers.FloatField()
    longitud = serializers.FloatField()
    piso = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    depto = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    hash_direccion = serializers.CharField()
    hash_geoloc = serializers.CharField()
    cantidad_paquetes = serializers.IntegerField(default=1)


class CalcularRutaOutputSerializer(serializers.Serializer):
    ruta_id = serializers.IntegerField()
    distancia_total_m = serializers.FloatField()
    duracion_total_s = serializers.FloatField()
    encoded_polyline = serializers.CharField()
    puntos_ruta = serializers.ListField()  # lista de puntos con direcciones físicas

class AsignarRutaSerializer(serializers.Serializer):
    ruta_id = serializers.IntegerField()
    conductor_id = serializers.IntegerField()

    def validate(self, data):
        try:
            data["ruta"] = Ruta.objects.get(id=data["ruta_id"])
        except Ruta.DoesNotExist:
            raise serializers.ValidationError("La ruta no existe.")

        try:
            data["conductor"] = Usuario.objects.get(id=data["conductor_id"])
        except Usuario.DoesNotExist:
            raise serializers.ValidationError("El conductor no existe.")

        return data