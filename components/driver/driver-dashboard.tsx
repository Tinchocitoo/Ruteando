"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Map, History, Navigation } from "lucide-react"

interface Address {
  id: string
  street: string
  city: string
  zipCode: string
  notes?: string
}

interface Delivery {
  id: string
  address: Address
  status: "pending" | "completed" | "failed"
  notes?: string
  timestamp: Date
}

interface DriverDashboardProps {
  onLoadAddresses: () => void
  onViewMap: () => void
  onViewHistory: () => void
  addresses: Address[]
  deliveries: Delivery[]
}

export function DriverDashboard({
  onLoadAddresses,
  onViewMap,
  onViewHistory,
  addresses,
  deliveries,
}: DriverDashboardProps) {
  const [hasCalculatedRoute, setHasCalculatedRoute] = useState(false)

  const handleCalculateRoute = () => {
    setHasCalculatedRoute(true)
    console.log("Calculate route clicked")
  }

  const handleStartRoute = () => {
    console.log("Start route clicked")
  }

  const completedToday = deliveries.filter(
    (d) => d.status === "completed" && new Date(d.timestamp).toDateString() === new Date().toDateString(),
  ).length

  const failedToday = deliveries.filter(
    (d) => d.status === "failed" && new Date(d.timestamp).toDateString() === new Date().toDateString(),
  ).length

  const pendingToday = deliveries.filter((d) => d.status === "pending").length

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-primary">{addresses.length}</div>
              <p className="text-sm text-foreground">Direcciones Cargadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-secondary">{completedToday}</div>
              <p className="text-sm text-foreground">Entregas Completadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-sans font-semibold">Acciones Principales</h2>

        {/* Load Addresses */}
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onLoadAddresses}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="bg-primary p-3 rounded-lg">
                <MapPin className="h-6 w-6 text-primary-foreground" />
              </div>
              Cargar Direcciones
            </CardTitle>
            <CardDescription>Ingresa direcciones una por una o importa un archivo CSV</CardDescription>
          </CardHeader>
        </Card>

        {/* View Map */}
        <Card
          className={`cursor-pointer transition-colors ${addresses.length > 0 ? "hover:bg-muted/50" : "opacity-50"}`}
          onClick={addresses.length > 0 ? onViewMap : undefined}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="bg-secondary p-3 rounded-lg">
                <Map className="h-6 w-6 text-secondary-foreground" />
              </div>
              Ver Mapa
              {addresses.length === 0 && (
                <Badge variant="secondary" className="ml-auto">
                  Requiere direcciones
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Visualiza las direcciones cargadas en el mapa</CardDescription>
          </CardHeader>
        </Card>

        {/* View History */}
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onViewHistory}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="bg-accent p-3 rounded-lg">
                <History className="h-6 w-6 text-accent-foreground" />
              </div>
              Ver Historial de Entregas
            </CardTitle>
            <CardDescription>Revisa el historial de todas tus entregas</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Route Actions (shown when addresses are loaded) */}
      {addresses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-md font-sans font-medium">Gestión de Ruta</h3>

          {!hasCalculatedRoute ? (
            <Button onClick={handleCalculateRoute} className="w-full" size="lg">
              <Navigation className="mr-2 h-5 w-5" />
              Calcular Ruta
            </Button>
          ) : (
            <div className="space-y-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary">Ruta Calculada</p>
                      <p className="text-sm text-foreground">
                        {addresses.length} paradas • Distancia estimada: 15.2 km
                      </p>
                    </div>
                    <Badge className="bg-primary text-primary-foreground">Listo</Badge>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleStartRoute} className="w-full" size="lg">
                <Navigation className="mr-2 h-5 w-5" />
                Iniciar Recorrido
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estadísticas del Día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-foreground">{pendingToday}</div>
              <p className="text-xs text-foreground">Pendientes</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-secondary">{completedToday}</div>
              <p className="text-xs text-foreground">Completadas</p>
            </div>
            <div>
              <div className="text-lg font-semibold text-destructive">{failedToday}</div>
              <p className="text-xs text-foreground">Fallidas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
