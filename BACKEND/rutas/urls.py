from django.urls import path
from .views import CalcularRutaView, AsignarRutaView, ProximidadPuntoRutaView

urlpatterns = [
    path('calcular/', CalcularRutaView.as_view(), name='calcular_ruta'),
    path('asignar/', AsignarRutaView.as_view(), name='asignar_ruta'),
    path("proximidad_punto_ruta/", ProximidadPuntoRutaView.as_view(), name="proximidad_punto_ruta"),
]