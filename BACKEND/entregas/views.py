from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from RuteandoAppDev.BACKEND.usuarios.decorators import solo_conductores
from RuteandoAppDev.BACKEND.usuarios.models import GestorConductor, Usuario
from rutas.models import Ruta, RutaEntrega, PuntoRuta
from entregas.models import Entrega, IntentoEntrega
from geoubicacion.models import Direccion
from .serializers import EntregaSerializer, IniciarRutaSerializer

#Iniciar Ruta
class IniciarRutaView(APIView):
    # Permite a un conductor iniciar una ruta asignada o creada por él.
    # Al iniciar:
    #   - Cambia el estado de la ruta a 'en_curso'.
    #   - Crea las entregas (una por dirección física).
    #   - Crea las relaciones RutaEntrega.

    @solo_conductores
    def post(self, request):
        serializer = IniciarRutaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ruta = serializer.validated_data["ruta"]
        conductor = serializer.validated_data["conductor"]

        # 1Verificar permiso de inicio
        if ruta.asignada_a != conductor and ruta.creada_por != conductor:
            return Response(
                {"error": "No tienes permiso para iniciar esta ruta."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar que la ruta esté pendiente o asignada
        if ruta.estado not in ["pendiente", "asignada"]:
            return Response(
                {"error": f"No se puede iniciar una ruta en estado '{ruta.estado}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Crear entregas y asociaciones
        with transaction.atomic():
            for punto in ruta.puntoruta_set.all():
                direcciones = Direccion.objects.filter(
                    geocoding_cache=punto.geocoding_cache
                )

                for direccion in direcciones:
                    entrega = Entrega.objects.create(
                        conductor=conductor,
                        direccion=direccion,
                        estado_global="pendiente",
                        cantidad_paquetes=getattr(direccion, "cantidad_paquetes", 1),
                        es_modificable=False,
                        fecha_creacion=timezone.now(),
                    )

                    RutaEntrega.objects.create(
                        ruta=ruta,
                        entrega=entrega,
                        punto_ruta=punto,
                        estado="pendiente",
                        fecha_asignacion=timezone.now(),
                    )

            # Cambiar estado de la ruta
            ruta.estado = "en_curso"
            ruta.save()

        # Respuesta para renderizar mapa en el front
        return Response({
            "mensaje": "Ruta iniciada correctamente.",
            "ruta_id": ruta.id,
            "polyline": ruta.geometry,
            "distancia_total_m": ruta.distancia_total_m,
            "duracion_total_s": ruta.duracion_total_s,
            "conductor": conductor.username,
            "estado": ruta.estado
        }, status=status.HTTP_200_OK)

########################################################################################################################
#Registrar intento de entrega, actualiza estado de entrega y rutaentrega
class RegistrarIntentoEntregaView(APIView):
    # Registra un intento de entrega (Fallida o Finalizada).
    # Actualiza el estado global de la Entrega y el estado de RutaEntrega.
    @solo_conductores
    def post(self, request, *args, **kwargs):
        data = request.data
        ruta_entrega_id = data.get("ruta_entrega_id")
        conductor_id = data.get("conductor_id")
        nuevo_estado = data.get("nuevo_estado")
        motivo = data.get("motivo")
        ubicacion_gps = data.get("ubicacion_gps")
        adjuntos_json = data.get("adjuntos_json", {})

        if not all([ruta_entrega_id, conductor_id, nuevo_estado]):
            return Response(
                {"error": "Faltan campos obligatorios."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            ruta_entrega = RutaEntrega.objects.select_related("entrega", "ruta").get(id=ruta_entrega_id)
        except RutaEntrega.DoesNotExist:
            return Response({"error": "RutaEntrega no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        try:
            conductor = Usuario.objects.get(id=conductor_id)
        except Usuario.DoesNotExist:
            return Response({"error": "Conductor no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        entrega = ruta_entrega.entrega

        # Validar conductor asignado
        if entrega.conductor_id != conductor.id:
            return Response(
                {"error": "El conductor no está autorizado para registrar esta entrega."},
                status=status.HTTP_403_FORBIDDEN
            )

        # No permitir modificar entregas finalizadas
        if entrega.estado_global == "Finalizada":
            return Response(
                {"error": "La entrega ya fue finalizada y no puede modificarse."},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            # Crear intento de entrega
            intento = IntentoEntrega.objects.create(
                entrega=entrega,
                conductor=conductor,
                estado_anterior=entrega.estado_global,
                nuevo_estado=nuevo_estado,
                motivo=motivo,
                ubicacion_gps=ubicacion_gps,
                adjuntos_json=adjuntos_json
            )

            # Actualizar estados
            entrega.estado_global = nuevo_estado
            entrega.save()

            ruta_entrega.estado = nuevo_estado
            ruta_entrega.fecha_intento = timezone.now()
            ruta_entrega.save()

        return Response({
            "mensaje": "Intento registrado correctamente.",
            "entrega_id": entrega.id,
            "nuevo_estado": nuevo_estado,
            "fecha_intento": intento.created_at,
        }, status=status.HTTP_200_OK)
    
########################################################################################################################
#Historial de Entregas segun el rol con filtros segun fecha y estado
# entregas/views.py
class HistorialEntregasView(APIView):
    # Devuelve el historial de entregas, filtrable por fecha y estado.
    # - Conductor: ve solo sus entregas.
    # - Gestor: ve las entregas de los conductores que él gestiona,
    #   pero solo de rutas que él mismo creó.

    def get(self, request, *args, **kwargs):
        user = request.user
        conductor_id = request.query_params.get("conductor_id")
        estado = request.query_params.get("estado")
        fecha_inicio = request.query_params.get("fecha_inicio")
        fecha_fin = request.query_params.get("fecha_fin")

        # Parseo de fechas
        from datetime import datetime
        try:
            if fecha_inicio:
                fecha_inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
            if fecha_fin:
                fecha_fin = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Formato de fecha inválido. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- CASO CONDUCTOR ---
        if user.tiene_rol("Conductor"):
            entregas = Entrega.objects.filter(conductor=user)

        # --- CASO GESTOR ---
        elif user.tiene_rol("Gestor"):
            if not conductor_id:
                return Response(
                    {"error": "Debe indicar conductor_id para ver su historial."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verificar vínculo activo Gestor-Conductor
            if not GestorConductor.objects.filter(
                id_gestor=user, id_conductor=conductor_id, es_active=True
            ).exists():
                return Response(
                    {"error": "El conductor no está vinculado a este gestor."},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Filtro correcto mediante la cadena de relaciones:
            entregas = Entrega.objects.filter(
                id_conductor=conductor_id,
                rutaentrega__ruta__creada_por=user  # Aquí se asegura el vínculo con el gestor
            ).distinct()

        else:
            return Response(
                {"error": "Rol no autorizado para acceder al historial de entregas."},
                status=status.HTTP_403_FORBIDDEN
            )

        # --- Filtros opcionales ---
        if estado:
            entregas = entregas.filter(estado_global__iexact=estado)
        if fecha_inicio:
            entregas = entregas.filter(fecha_creacion__date__gte=fecha_inicio)
        if fecha_fin:
            entregas = entregas.filter(fecha_creacion__date__lte=fecha_fin)

        serializer = EntregaSerializer(entregas, many=True)

        return Response({
            "rol": "gestor" if user.tiene_rol("Gestor") else "conductor",
            "cantidad_entregas": entregas.count(),
            "filtros": {
                "estado": estado,
                "fecha_inicio": fecha_inicio,
                "fecha_fin": fecha_fin,
                "conductor_id": conductor_id
            },
            "entregas": serializer.data
        })

#######################################################################################3
#Finalizar Ruta
class FinalizarRutaView(APIView):
    # Permite al conductor finalizar una ruta en curso.
    # - Cambia el estado de la ruta a 'finalizada'.
    # - Marca las entregas pendientes como fallidas.
    # - Actualiza los estados en RutaEntrega.

    def post(self, request):
        ruta_id = request.data.get("ruta_id")
        conductor_id = request.data.get("conductor_id")

        if not ruta_id or not conductor_id:
            return Response({"error": "Faltan datos requeridos."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            ruta = Ruta.objects.get(id=ruta_id, asignada_a_id=conductor_id, estado="en_curso")
        except Ruta.DoesNotExist:
            return Response(
                {"error": "Ruta no encontrada o no está en curso."},
                status=status.HTTP_404_NOT_FOUND
            )

        with transaction.atomic():
            # Actualizar entregas pendientes a fallidas
            entregas_pendientes = Entrega.objects.filter(
                rutaentrega__ruta=ruta,
                estado_global__in=["pendiente"]
            )

            cantidad_fallidas = entregas_pendientes.count()

            for entrega in entregas_pendientes:
                entrega.estado_global = "fallida"
                entrega.save()

                # Actualizar también la tabla intermedia
                ruta_entrega = RutaEntrega.objects.filter(ruta=ruta, entrega=entrega).first()
                if ruta_entrega:
                    ruta_entrega.estado = "fallida"
                    ruta_entrega.fecha_intento = timezone.now()
                    ruta_entrega.save()

            # Cambiar estado de la ruta
            ruta.estado = "finalizada"
            ruta.fecha_finalizacion = timezone.now()
            ruta.save()

        return Response({
            "mensaje": f"Ruta finalizada correctamente. {cantidad_fallidas} entregas marcadas como fallidas.",
            "ruta_id": ruta.id,
            "estado_final": ruta.estado
        }, status=status.HTTP_200_OK)