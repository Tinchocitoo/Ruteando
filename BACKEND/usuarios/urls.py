from django.urls import path
from .views import (
    CambiarRolView, GenerarCodigoVinculacionView,
    VincularConductorView, DesvincularConductorView
)

urlpatterns = [
    path('cambiar_rol/', CambiarRolView.as_view(), name='cambiar_rol'),
    path('generar_codigo/', GenerarCodigoVinculacionView.as_view(), name='generar_codigo'),
    path('vincular_conductor/', VincularConductorView.as_view(), name='vincular_conductor'),
    path('desvincular_conductor/', DesvincularConductorView.as_view(), name='desvincular_conductor'),
]
