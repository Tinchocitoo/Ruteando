import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  Loader2,
} from "lucide-react";
import { Address } from "@/types/address";
import { apiIniciarRuta, apiRegistrarIntentoEntrega } from "@/services/api";
import type { IniciarRutaResponse } from "@/types/backend";

interface RouteNavigationProps {
  addresses: Address[];
  rutaId: number | null;
  conductorId?: number;
  onBack: () => void;
  onComplete: (summary: {
    completed: Address[];
    failed: Address[];
    date: string;
  }) => void;
}

export function RouteNavigation({
  addresses,
  rutaId,
  conductorId,
  onBack,
  onComplete,
}: RouteNavigationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Usar un Map para mantener el estado de cada dirección por su ID, preservando el orden del backend
  const [deliveryStatus, setDeliveryStatus] = useState<Map<string, 'completed' | 'failed'>>(new Map());
  // Mapa de direcciones a ruta_entrega_id usando coordenadas como clave
  const [addressToRutaEntregaId, setAddressToRutaEntregaId] = useState<Map<string, number>>(new Map());

  const current = addresses[currentIndex];

  console.log("📋 Addresses en memoria:", addresses);


// Iniciar la ruta cuando se monta el componente
useEffect(() => {
  const initializeRoute = async () => {
    if (!rutaId || !conductorId) {
      setError("Faltan datos necesarios (rutaId o conductorId)");
      setIsInitializing(false);
      return;
    }

    try {
      setIsInitializing(true);
      console.log("🚀 Iniciando ruta:", { rutaId, conductorId });

      const response: IniciarRutaResponse = await apiIniciarRuta({
        ruta_id: rutaId,
        conductor_id: conductorId,
      });

      console.log("✅ Ruta iniciada:", response);
      console.log("📦 entregas_creadas RAW:", response.entregas_creadas);

      // 🧭 Mapa hash_geoloc → ruta_entrega_id
      const entregaMap = new Map<string, number>();

      (response.entregas_creadas || []).forEach((entrega: any) => {
        if (entrega.hash_geoloc) {
          entregaMap.set(entrega.hash_geoloc, entrega.ruta_entrega_id);
        }
        if (typeof entrega.latitud === 'number' && typeof entrega.longitud === 'number') {
          const coordKey = `${entrega.latitud.toFixed(5)}_${entrega.longitud.toFixed(5)}`;
          entregaMap.set(coordKey, entrega.ruta_entrega_id);
        }
      });

      console.log(
        "📦 Mapa entregaMap (hash_geoloc → ruta_entrega_id):",
        Array.from(entregaMap.entries())
      );

      setAddressToRutaEntregaId(entregaMap);
      setIsInitializing(false);
    } catch (err: any) {
      console.error("❌ Error al iniciar la ruta:", err);
      setError(err.message || "Error al iniciar la ruta");
      setIsInitializing(false);
    }
  };

  initializeRoute();
}, [rutaId, conductorId]);
const handleComplete = async (success: boolean) => {
  if (!conductorId || !current.coordinates) {
    alert("Faltan datos necesarios para registrar la entrega");
    return;
  }

  // 🧩 Usar hash_geoloc del objeto actual
  const key = current.hash_geoloc;
  let rutaEntregaId = key ? addressToRutaEntregaId.get(key) : undefined;
  if (!rutaEntregaId && current.coordinates) {
    const coordKey = `${current.coordinates.latitude.toFixed(5)}_${current.coordinates.longitude.toFixed(5)}`;
    rutaEntregaId = addressToRutaEntregaId.get(coordKey);
  }

  console.log("📍 current.hash_geoloc:", key);
  console.log("🔗 rutaEntregaId encontrado:", rutaEntregaId);
  console.log("🗺️ Mapa actual:", Array.from(addressToRutaEntregaId.entries()));

  if (!rutaEntregaId) {
    console.error("❌ No se encontró ruta_entrega_id para la dirección:", current);
    alert("Error: No se pudo encontrar la información de la entrega");
    return;
  }

  try {
    setIsLoading(true);

    await apiRegistrarIntentoEntrega({
      ruta_entrega_id: rutaEntregaId,
      conductor_id: conductorId,
      nuevo_estado: success ? "completada" : "fallida",
      motivo: success ? null : "Entrega fallida",
      ubicacion_gps: current.coordinates
        ? {
            lat: current.coordinates.latitude,
            lng: current.coordinates.longitude,
          }
        : null,
    });

    console.log(
      `✅ Entrega ${success ? "completada" : "fallida"} registrada en el backend`
    );

    const newStatus = new Map(deliveryStatus);
    newStatus.set(current.id, success ? "completed" : "failed");
    setDeliveryStatus(newStatus);

    const isLast = currentIndex >= addresses.length - 1;
    if (!isLast) {
      setCurrentIndex((i) => i + 1);
    } else {
      const completed: Address[] = [];
      const failed: Address[] = [];

      addresses.forEach((addr) => {
        const status = newStatus.get(addr.id);
        if (status === "completed") completed.push(addr);
        else if (status === "failed") failed.push(addr);
      });

      const finalSummary = {
        completed,
        failed,
        date: new Date().toLocaleString("es-AR"),
      };

      onComplete(finalSummary);
    }
  } catch (err: any) {
    console.error("❌ Error al registrar la entrega:", err);
    alert(
      err.message ||
        "Error al registrar la entrega. Por favor, intenta nuevamente."
    );
  } finally {
    setIsLoading(false);
  }
};


  if (isInitializing) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Iniciando ruta...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={onBack} variant="outline">
            Volver al mapa
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!addresses.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No hay direcciones para navegar.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al mapa
        </Button>
        <div>
          <h1 className="text-xl font-bold">Confirmar Entregas</h1>
          <p className="text-sm text-muted-foreground">
            {currentIndex + 1} de {addresses.length} direcciones
          </p>
        </div>
      </div>

      {/* Dirección actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Entrega actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="font-medium">{current.street}</p>
            <p className="text-sm text-muted-foreground">
              {current.city}
              {current.zipCode && ` (${current.zipCode})`}
            </p>
            {current.floor && current.apartment && (
              <p className="text-sm italic text-muted-foreground">
                Piso {current.floor}, Depto {current.apartment}
              </p>
            )}

            {/* Botones de acción */}
            <div className="flex flex-col gap-2 mt-4">
              <Button
                onClick={() => handleComplete(true)}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Entrega completada
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleComplete(false)}
                disabled={isLoading}
                className="w-full"
                variant="destructive"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Entrega fallida
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentIndex === addresses.length - 1 && (
        <p className="mt-4 text-center text-sm text-green-600 font-medium">
          Última entrega — guardando recorrido…
        </p>
      )}

      {/* Resumen parcial */}
      {deliveryStatus.size > 0 && (() => {
        // Construir arrays temporales para el resumen, manteniendo el orden del backend
        const completed: Address[] = [];
        const failed: Address[] = [];

        addresses.forEach((addr) => {
          const status = deliveryStatus.get(addr.id);
          if (status === 'completed') {
            completed.push(addr);
          } else if (status === 'failed') {
            failed.push(addr);
          }
        });

        return (completed.length > 0 || failed.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Resumen del recorrido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {completed.map((a) => (
                  <li key={a.id} className="text-green-600">
                    ✅ {a.street}
                  </li>
                ))}
                {failed.map((a) => (
                  <li key={a.id} className="text-red-600">
                    ❌ {a.street}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
