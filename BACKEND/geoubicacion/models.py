from django.db import models

# Create your models here.
from django.db import models
from comun.models import BaseModel



class APIGeocodingCache(BaseModel):
    latitud = models.DecimalField(max_digits=10, decimal_places=7)
    longitud = models.DecimalField(max_digits=10, decimal_places=7)
    proveedor = models.CharField(max_length=100, default='google')
    hash_geoloc = models.CharField(max_length=100, db_index=True) 
    raw_response = models.JSONField()

    def __str__(self):
        return f"Cache {self.direccion}"
    

class Direccion(BaseModel):
    geocoding_cache = models.ForeignKey(APIGeocodingCache,on_delete=models.SET_NULL,null=True,blank=True,related_name="direcciones")
    calle = models.CharField(max_length=100)
    numero = models.CharField(max_length=10)
    piso = models.CharField(max_length=10, null=True, blank=True)
    depto = models.CharField(max_length=10, null=True, blank=True)
    ciudad = models.CharField(max_length=100)
    provincia = models.CharField(max_length=100)
    pais = models.CharField(max_length=100)
    codigo_postal = models.CharField(max_length=20, null=True, blank=True)
    hash_direccion = models.CharField(max_length=100, unique=True, db_index=True)
    texto_normalizado = models.TextField()

    def __str__(self):
        return f"{self.calle} {self.numero}, {self.ciudad}"
