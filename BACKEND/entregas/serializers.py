from rest_framework import serializers 
from RuteandoAppDev.BACKEND.rutas.models import Ruta
from RuteandoAppDev.BACKEND.usuarios.models import Usuario


class IniciarRutaSerializer(serializers.Serializer):
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

        ruta = data["ruta"]
        conductor = data["conductor"]

        # Caso 1: Ruta creada por el propio conductor
        if ruta.creada_por == conductor:
            # Se autoasigna si aún no lo estaba
            ruta.asignada_a = conductor
            ruta.solo_lectura = False
            ruta.estado = "pendiente"
            ruta.save()
            return data

        # Caso 2: Ruta asignada por un gestor
        if ruta.asignada_a != conductor:
            raise serializers.ValidationError("Esta ruta no está asignada a este conductor.")
        if ruta.estado not in ["asignada", "pendiente"]:
            raise serializers.ValidationError("Solo pueden iniciarse rutas pendientes o asignadas.")

        return data


# entregas/serializers.py
from rest_framework import serializers
from .models import Entrega


class EntregaSerializer(serializers.ModelSerializer):
    direccion_texto = serializers.SerializerMethodField()

    class Meta:
        model = Entrega
        fields = [
            "id",
            "estado_global",
            "observacion",
            "cantidad_paquetes",
            "direccion_texto",
            "fecha_creacion",
            "fecha_actualizacion",
        ]

    def get_direccion_texto(self, obj):
        if obj.direccion:
            base = f"{obj.direccion.calle} {obj.direccion.numero}, {obj.direccion.ciudad}"
            if obj.direccion.piso or obj.direccion.depto:
                base += f", Piso {obj.direccion.piso or ''} Dpto {obj.direccion.depto or ''}"
            return base
        return None
