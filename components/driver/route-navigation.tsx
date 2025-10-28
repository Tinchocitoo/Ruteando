import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
} from "lucide-react";
import { Address } from "@/types/address";

interface RouteNavigationProps {
  addresses: Address[];
  onBack: () => void;
  onComplete: (summary: {
    completed: Address[];
    failed: Address[];
    date: string;
  }) => void;
}

export function RouteNavigation({
  addresses,
  onBack,
  onComplete,
}: RouteNavigationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Address[]>([]);
  const [failed, setFailed] = useState<Address[]>([]);

  const current = addresses[currentIndex];

  const handleComplete = (success: boolean) => {
    const updatedCompleted = success ? [...completed, current] : completed;
    const updatedFailed = !success ? [...failed, current] : failed;

    const isLast = currentIndex >= addresses.length - 1;

    if (!isLast) {
      setCompleted(updatedCompleted);
      setFailed(updatedFailed);
      setCurrentIndex((i) => i + 1);
    } else {
      const finalSummary = {
        completed: updatedCompleted,
        failed: updatedFailed,
        date: new Date().toLocaleString("es-AR"),
      };

      setCompleted(updatedCompleted);
      setFailed(updatedFailed);
      onComplete(finalSummary);
    }
  };

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
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Entrega completada
              </Button>

              <Button
                onClick={() => handleComplete(false)}
                className="w-full"
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Entrega fallida
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
      {(completed.length > 0 || failed.length > 0) && (
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
      )}
    </div>
  );
}
