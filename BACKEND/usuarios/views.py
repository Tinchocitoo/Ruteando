from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from RuteandoAppDev.BACKEND.usuarios.decorators import solo_conductores, solo_gestores
from .models import CodigoVinculacion, GestorConductor, Usuario
from datetime import date, timedelta

class CambiarRolView(APIView):
    def post(self, request):
        user = request.user
        nuevo_rol = request.data.get("nuevo_rol")

        if nuevo_rol not in ["Gestor", "Conductor"]:
            return Response({"error": "Rol inválido."}, status=status.HTTP_400_BAD_REQUEST)

        if nuevo_rol == "Gestor" and not user.es_premium:
            return Response({"error": "Debes tener una suscripción activa para ser Gestor."}, status=status.HTTP_403_FORBIDDEN)

        user.cambiar_rol(nuevo_rol)
        return Response({
            "mensaje": f"Modo cambiado a {nuevo_rol}.",
            "rol_actual": user.rol_actual
        }, status=status.HTTP_200_OK)


class GenerarCodigoVinculacionView(APIView):
    @solo_gestores
    def post(self, request):
        user = request.user

        # Crear un nuevo código de vinculación (válido 30 min)
        codigo = CodigoVinculacion.crear_codigo(gestor=user, minutos_validez=30)

        return Response({
            "codigo": codigo.codigo,
            "gestor": user.username,
            "expira_en": codigo.expira_en,
            "mensaje": "Código generado correctamente."
        }, status=status.HTTP_201_CREATED)
    

#VINCULAR GESTOR CON CONDUCTOR MEDIANTE CÓDIGO
class VincularConductorView(APIView):
    @solo_conductores
    def post(self, request):
        codigo_str = request.data.get("codigo")
        if not codigo_str:
            return Response({"error": "Debe proporcionar un código válido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            codigo = CodigoVinculacion.objects.get(codigo=codigo_str)
        except CodigoVinculacion.DoesNotExist:
            return Response({"error": "Código no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not codigo.es_valido():
            return Response({"error": "El código ha expirado."}, status=status.HTTP_400_BAD_REQUEST)

        conductor = request.user
        gestor = codigo.gestor

        # Evitar duplicados
        if GestorConductor.objects.filter(gestor=gestor, conductor=conductor).exists():
            return Response({"mensaje": "Ya estás vinculado con este gestor."}, status=status.HTTP_200_OK)

        # Crear vinculación
        GestorConductor.objects.create(gestor=gestor, conductor=conductor)

        # Eliminar el código (ya usado)
        codigo.delete()

        return Response({
            "mensaje": f"Vinculación exitosa con el gestor {gestor.username}."
        }, status=status.HTTP_201_CREATED)
    

#DESVINCULAR GESTOR DE CONDUCTOR 
class DesvincularConductorView(APIView):
    def post(self, request):
        gestor_id = request.data.get("gestor_id")
        conductor_id = request.data.get("conductor_id")

        try:
            relacion = GestorConductor.objects.get(gestor_id=gestor_id, conductor_id=conductor_id)
        except GestorConductor.DoesNotExist:
            return Response({"error": "No existe relación entre este gestor y conductor."}, status=status.HTTP_404_NOT_FOUND)

        relacion.delete()
        return Response({"mensaje": "Desvinculación completada correctamente."}, status=status.HTTP_200_OK)