from django.urls import path
from .views import FinalizarRutaView, IniciarRutaView, RegistrarIntentoEntregaView, HistorialEntregasView

urlpatterns = [
    path('iniciar_ruta/', IniciarRutaView.as_view(), name='iniciar_ruta'),
    path('registrar_intento/', RegistrarIntentoEntregaView.as_view(), name='registrar_intento_entrega'),
    path('historial/', HistorialEntregasView.as_view(), name='historial_entregas'),
    path("finalizar_ruta/", FinalizarRutaView.as_view(), name="finalizar_ruta"),
]
