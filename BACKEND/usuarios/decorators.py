from rest_framework.response import Response
from rest_framework import status


def solo_gestores(view_func):
    def wrapper(request, *args, **kwargs):
        user = request.user
        if not user.tiene_rol("Gestor") or not user.suscripcion_activa():
            return Response(
                {"error": "Funcionalidad exclusiva para gestores con suscripción activa."},
                status=status.HTTP_403_FORBIDDEN
            )
        return view_func(request, *args, **kwargs)
    return wrapper


def solo_conductores(view_func):
    def wrapper(request, *args, **kwargs):
        user = request.user
        if not user.tiene_rol("Conductor"):
            return Response(
                {"error": "Solo los conductores pueden acceder a esta funcionalidad."},
                status=status.HTTP_403_FORBIDDEN
            )
        return view_func(request, *args, **kwargs)
    return wrapper
