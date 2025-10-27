from time import timezone
import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from datetime import date, timedelta


class Usuario(AbstractUser):
    ROL_CHOICES = (
        ("Conductor", "Conductor"),
        ("Gestor", "Gestor"),
    )

    rol_actual = models.CharField(max_length=20, choices=ROL_CHOICES, default="Conductor")
    es_premium = models.BooleanField(default=False)
    fecha_inicio_premium = models.DateField(null=True, blank=True)
    fecha_fin_premium = models.DateField(null=True, blank=True)

    def tiene_rol(self, rol: str) -> bool:
        # Verifica si el usuario tiene un rol específico.
        return self.rol_actual.lower() == rol.lower()

    def cambiar_rol(self, nuevo_rol: str):
        # Cambia dinámicamente entre Conductor y Gestor.
        if nuevo_rol not in ["Conductor", "Gestor"]:
            raise ValueError("Rol inválido.")
        self.rol_actual = nuevo_rol
        self.save()

    def suscripcion_activa(self) -> bool:
        # Verifica si el plan premium está vigente.
        if not self.es_premium:
            return False
        if not self.fecha_fin_premium:
            return False
        return date.today() <= self.fecha_fin_premium

    def esta_vinculado_con(self, otro_usuario) -> bool:
        # Verifica si el usuario (conductor) está vinculado a un gestor.
        return GestorConductor.objects.filter(
            gestor=otro_usuario, conductor=self, activo=True
        ).exists()

    def __str__(self):
        return f"{self.username} ({self.rol_actual})"


class GestorConductor(models.Model):
    # Asocia gestores con conductores que gestionan.
    gestor = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="conductores_asociados")
    conductor = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name="gestores_asociados")
    fecha_asociacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ("gestor", "conductor")

    def __str__(self):
        return f"{self.gestor.username} → {self.conductor.username}"


class CodigoVinculacion(models.Model):
    gestor = models.ForeignKey('usuarios.Usuario', on_delete=models.CASCADE, related_name='codigos_vinculacion')
    codigo = models.CharField(max_length=10, unique=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    expira_en = models.DateTimeField()

    def es_valido(self):
        return timezone.now() < self.expira_en

    @staticmethod
    def generar_codigo():
        # """Genera un código único legible tipo ABCD-1234."""
        return str(uuid.uuid4())[:8].upper().replace('-', '')
    
    @classmethod
    def crear_codigo(cls, gestor, minutos_validez=30):
        return cls.objects.create(
            gestor=gestor,
            codigo=cls.generar_codigo(),
            expira_en=timezone.now() + timedelta(minutes=minutos_validez)
        )

    def __str__(self):
        return f"Código {self.codigo} (Gestor: {self.gestor.username})"


#MODELO USUARIOS VIEJO

# # Create your models here.
# from django.db import models
# from comun.models import BaseModel

# class Rol(BaseModel):
#     nombre_rol = models.CharField(max_length=50)

#     def __str__(self):
#         return self.nombre_rol


# class Usuario(BaseModel):
#     nombre = models.CharField(max_length=100)
#     email = models.EmailField(unique=True)
#     contrasena = models.CharField(max_length=255)
#     fecha_nacimiento = models.DateField(null=True, blank=True)
#     es_activo = models.BooleanField(default=True)

#     def __str__(self):
#         return self.nombre


# class UsuarioRol(models.Model):
#     usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
#     rol = models.ForeignKey(Rol, on_delete=models.CASCADE)

#     class Meta:
#         unique_together = ('usuario', 'rol')


# class GestorConductor(BaseModel):
#     gestor = models.ForeignKey(Usuario, related_name='gestores', on_delete=models.CASCADE)
#     conductor = models.ForeignKey(Usuario, related_name='conductores', on_delete=models.CASCADE)

#     class Meta:
#         unique_together = ('gestor', 'conductor')
