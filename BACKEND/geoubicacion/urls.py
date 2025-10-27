from django.urls import path
from .views import CargarDireccionesView

urlpatterns = [
    path('cargar_direcciones/', CargarDireccionesView.as_view(), name='cargar_direcciones'),
]
