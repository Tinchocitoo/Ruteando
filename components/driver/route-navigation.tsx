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

// Item de entrega individual devuelto por IniciarRuta
type DeliveryItem = {
  ruta_entrega_id: number;
  entrega_id: number;
  direccion_id: number;
  estado: string;
  latitud: number | null;
  longitud: number | null;
  texto_normalizado: string;
  hash_geoloc: string | null;
};

export function RouteNavigation({
  addresses,
  rutaId,
  conductorId,
  onBack,
  onComplete,
}: RouteNavigationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lista de entregas individuales que viene del backend
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Estado por dirección (clave = direccion_id como string)
  const [deliveryStatus, setDeliveryStatus] = useState<
    Map<string, "completed" | "failed">
  >(new Map());

  const currentDelivery = deliveries[currentIndex] || null;
  const currentAddress: Address | null =
    currentDelivery
      ? addresses.find(
          (a) => String(a.id) === String(currentDelivery.direccion_id)
        ) || null
      : null;

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
        console.log("📦 entregas_creadas:", response.entregas_creadas);

        const creadas = (response.entregas_creadas || []) as any[];
        const mapped: DeliveryItem[] = creadas.map((e) => ({
          ruta_entrega_id: e.ruta_entrega_id,
          entrega_id: e.entrega_id,
          direccion_id: e.direccion_id,
          estado: e.estado,
          latitud: e.latitud ?? null,
          longitud: e.longitud ?? null,
          texto_normalizado: e.texto_normalizado ?? "",
          hash_geoloc: e.hash_geoloc ?? null,
        }));

        setDeliveries(mapped);
        setCurrentIndex(0);
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
    if (!conductorId || !currentDelivery) {
      alert("Faltan datos necesarios para registrar la entrega");
      return;
    }

    try {
      setIsLoading(true);

      await apiRegistrarIntentoEntrega({
        ruta_entrega_id: currentDelivery.ruta_entrega_id,
        conductor_id: conductorId,
        nuevo_estado: success ? "completada" : "fallida",
        motivo: success ? null : "Entrega fallida",
        ubicacion_gps:
          currentDelivery.latitud != null && currentDelivery.longitud != null
            ? { lat: currentDelivery.latitud, lng: currentDelivery.longitud }
            : null,
      });

      console.log(
        `✅ Entrega ${success ? "completada" : "fallida"} registrada correctamente (ruta_entrega_id=${currentDelivery.ruta_entrega_id})`
      );

      // Marcar estado por direccion_id (clave string para evitar mismatch)
      const nextStatus = new Map(deliveryStatus);
      nextStatus.set(
        String(currentDelivery.direccion_id),
        success ? "completed" : "failed"
      );
      setDeliveryStatus(nextStatus);

      // Avanzar al siguiente delivery
      const isLast = currentIndex >= deliveries.length - 1;
      if (!isLast) {
        setCurrentIndex((i) => i + 1);
      } else {
        // Resumen: mapear estados (por direccion_id) a las addresses de UI
        const completed: Address[] = [];
        const failed: Address[] = [];

        addresses.forEach((addr) => {
          const status = nextStatus.get(String(addr.id));
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

  if (!deliveries.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No hay entregas para navegar.
        </CardContent>
      </Card>
    );
  }

  // Hallar primer address fallida (para "Reintentar")
  const firstFailedAddress = addresses.find(
    (a) => deliveryStatus.get(String(a.id)) === "failed"
  );
  const hasFailures = Boolean(firstFailedAddress);

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
            {currentIndex + 1} de {deliveries.length} entregas
          </p>
        </div>
      </div>

      {/* Entrega actual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Entrega actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Título/dirección amigable */}
            <p className="font-medium">
              {currentAddress?.street || currentDelivery?.texto_normalizado}
            </p>
            <p className="text-sm text-muted-foreground">
              {currentAddress?.city}
              {currentAddress?.zipCode && ` (${currentAddress.zipCode})`}
            </p>
            {currentAddress?.floor && currentAddress?.apartment && (
              <p className="text-sm italic text-muted-foreground">
                Piso {currentAddress.floor}, Depto {currentAddress.apartment}
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

      {currentIndex === deliveries.length - 1 && (
        <p className="mt-4 text-center text-sm text-green-600 font-medium">
          Última entrega — guardando recorrido…
        </p>
      )}

      {/* Resumen parcial */}
      {deliveryStatus.size > 0 &&
        (() => {
          const completed: Address[] = [];
          const failed: Address[] = [];

          addresses.forEach((addr) => {
            const status = deliveryStatus.get(String(addr.id));
            if (status === "completed") completed.push(addr);
            else if (status === "failed") failed.push(addr);
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
                    <li key={String(a.id)} className="text-green-600">
                      ✅ {a.street}
                    </li>
                  ))}
                  {failed.map((a) => (
                    <li key={String(a.id)} className="text-red-600">
                      ❌ {a.street}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })()}

      {hasFailures && firstFailedAddress && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              // Ir a la primera entrega cuyo direccion_id coincide con la primera address fallida
              const failedId = String(firstFailedAddress.id);
              const targetIndex = deliveries.findIndex(
                (d) => String(d.direccion_id) === failedId
              );

              const next = new Map(deliveryStatus);
              next.delete(failedId); // permitir reintentar
              setDeliveryStatus(next);

              if (targetIndex >= 0) {
                setCurrentIndex(targetIndex);
              }
            }}
          >
            Reintentar fallidas
          </Button>
        </div>
      )}
    </div>
  );
}
