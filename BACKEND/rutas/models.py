from django.db import models

# Create your models here.


from django.db import models
from comun.models import BaseModel
from usuarios.models import Usuario
from entregas.models import Entrega
from geoubicacion.models import APIGeocodingCache, PuntoUbicacion

class Ruta(BaseModel):
    creada_por = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='rutas_creadas')
    asignada_a = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, related_name='rutas_asignadas')
    fecha_asignacion = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=50, default='pendiente')
    distancia_total_m = models.FloatField(null=True, blank=True)
    duracion_total_s = models.FloatField(null=True, blank=True)
    solo_lectura = models.BooleanField(default=False)
    geometry = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Ruta {self.id} - {self.estado}"



class PuntoRuta(BaseModel):
    ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE)
    geocoding_cache = models.ForeignKey(APIGeocodingCache, on_delete=models.SET_NULL, null=True, blank=True)
    orden = models.PositiveIntegerField()
    duracion_prev = models.FloatField(null=True, blank=True)
    distancia_prev = models.FloatField(null=True, blank=True)
    fue_visitada = models.BooleanField(default=False)

    def __str__(self):
        return f"Punto {self.orden} de Ruta {self.ruta.id}"
    
class PuntoUbicacion(BaseModel):
    ruta = models.OneToOneField("rutas.Ruta", on_delete=models.CASCADE, related_name="ubicacion_actual")
    latitud = models.DecimalField(max_digits=10, decimal_places=7)
    longitud = models.DecimalField(max_digits=10, decimal_places=7)
    proveedor = models.CharField(max_length=100, default="gps")
    exactitud = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Ubicación ruta {self.ruta.id} ({self.latitud}, {self.longitud})"


class RutaEntrega(BaseModel):
    ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE)
    entrega = models.ForeignKey(Entrega, on_delete=models.CASCADE)
    punto_ruta = models.ForeignKey(PuntoRuta, on_delete=models.CASCADE)
    estado = models.CharField(max_length=50, default='pendiente')
    motivo_falla = models.TextField(null=True, blank=True)
    observacion = models.TextField(null=True, blank=True)
    fecha_asignacion = models.DateTimeField(null=True, blank=True)
    fecha_intento = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Entrega {self.entrega.id} en Ruta {self.ruta.id}"
