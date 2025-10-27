from django.db import models

# Create your models here.
from django.db import models
from comun.models import BaseModel
from usuarios.models import Usuario
from geoubicacion.models import Direccion

class Entrega(BaseModel):
    conductor = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='entregas')
    direccion = models.ForeignKey(Direccion, on_delete=models.CASCADE)
    estado_global = models.CharField(max_length=50, default='pendiente')
    observacion = models.TextField(null=True, blank=True)
    es_modificable = models.BooleanField(default=True)
    cantidad_paquetes = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"Entrega {self.id} - {self.direccion}"


class IntentoEntrega(BaseModel):
    entrega = models.ForeignKey(Entrega, on_delete=models.CASCADE)
    ruta_entrega = models.ForeignKey('rutas.RutaEntrega', on_delete=models.CASCADE, related_name='intentos')
    conductor = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    estado_anterior = models.CharField(max_length=50)
    nuevo_estado = models.CharField(max_length=50)
    motivo = models.TextField(null=True, blank=True)
    ubicacion_gps = models.JSONField(null=True, blank=True)
    adjuntos_json = models.JSONField(null=True, blank=True)
    fecha_intento = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Intento {self.id} - {self.nuevo_estado}"
