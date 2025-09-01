"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, MapPin, Route, Play, RotateCcw } from "lucide-react"

interface Address {
  id: string
  street: string
  city: string
  zipCode: string
  notes?: string
  coordinates?: { lat: number; lng: number }
}

interface MapViewProps {
  addresses: Address[]
  onBack: () => void
  onStartRoute?: () => void
  showRouteControls?: boolean
}

export function MapView({ addresses, onBack, onStartRoute, showRouteControls = true }: MapViewProps) {
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [routeCalculated, setRouteCalculated] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)

  // Mock coordinates for demonstration
  const mockCoordinates = [
    { lat: 40.4168, lng: -3.7038 }, // Madrid
    { lat: 40.42, lng: -3.69 },
    { lat: 40.41, lng: -3.71 },
    { lat: 40.425, lng: -3.695 },
    { lat: 40.415, lng: -3.72 },
  ]

  const addressesWithCoords = addresses.map((addr, index) => ({
    ...addr,
    coordinates: mockCoordinates[index % mockCoordinates.length],
  }))

  const handleCalculateRoute = async () => {
    setIsCalculatingRoute(true)
    // Simulate route calculation
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setRouteCalculated(true)
    setIsCalculatingRoute(false)
  }

  const handleRecalculateRoute = () => {
    setRouteCalculated(false)
    handleCalculateRoute()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-xl font-sans font-bold">Mapa de Entregas</h1>
          <p className="text-sm text-muted-foreground">
            {addresses.length} direcciones cargadas
            {routeCalculated && " • Ruta optimizada"}
          </p>
        </div>
      </div>

      {/* Map Container */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Vista del Mapa
            </CardTitle>
            {routeCalculated && <Badge className="bg-primary text-primary-foreground">Ruta Calculada</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {/* Mock Map Display */}
          <div className="relative bg-muted/30 rounded-lg h-96 overflow-hidden">
            {/* Map Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" className="text-muted-foreground">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Address Markers */}
            {addressesWithCoords.map((address, index) => (
              <div
                key={address.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                  selectedAddress?.id === address.id ? "scale-125 z-10" : "hover:scale-110"
                }`}
                style={{
                  left: `${20 + ((index * 15) % 60)}%`,
                  top: `${20 + ((index * 12) % 60)}%`,
                }}
                onClick={() => setSelectedAddress(selectedAddress?.id === address.id ? null : address)}
              >
                <div className="relative">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ${
                      index === 0 ? "bg-green-500" : index === addresses.length - 1 ? "bg-red-500" : "bg-primary"
                    }`}
                  >
                    {index + 1}
                  </div>
                  {routeCalculated && index < addresses.length - 1 && (
                    <div className="absolute top-4 left-4 w-12 h-0.5 bg-primary transform rotate-45 origin-left"></div>
                  )}
                </div>
              </div>
            ))}

            {/* Route Path (when calculated) */}
            {routeCalculated && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path
                  d={`M ${20 + ((0 * 15) % 60)}% ${20 + ((0 * 12) % 60)}% ${addressesWithCoords
                    .slice(1)
                    .map((_, index) => `L ${20 + (((index + 1) * 15) % 60)}% ${20 + (((index + 1) * 12) % 60)}%`)
                    .join(" ")}`}
                  stroke="rgb(5, 150, 105)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="5,5"
                  className="animate-pulse"
                />
              </svg>
            )}

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span>Inicio</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 bg-primary rounded-full"></div>
                <span>Parada</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>Final</span>
              </div>
            </div>

            {/* Route Info */}
            {routeCalculated && (
              <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm rounded-lg p-3">
                <div className="text-sm space-y-1">
                  <div className="font-medium">Ruta Optimizada</div>
                  <div className="text-muted-foreground">Distancia: ~15.2 km</div>
                  <div className="text-muted-foreground">Tiempo est.: ~45 min</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Address Details */}
      {selectedAddress && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Dirección Seleccionada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{selectedAddress.street}</p>
              <p className="text-sm text-muted-foreground">
                {selectedAddress.city} {selectedAddress.zipCode && `• ${selectedAddress.zipCode}`}
              </p>
              {selectedAddress.notes && <p className="text-sm text-muted-foreground italic">{selectedAddress.notes}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Route Controls */}
      {showRouteControls && (
        <div className="space-y-4">
          {!routeCalculated ? (
            <Button
              onClick={handleCalculateRoute}
              disabled={isCalculatingRoute || addresses.length === 0}
              className="w-full"
              size="lg"
            >
              {isCalculatingRoute ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Calculando Ruta...
                </>
              ) : (
                <>
                  <Route className="mr-2 h-5 w-5" />
                  Calcular Ruta Optimizada
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary">Ruta Optimizada</p>
                      <p className="text-sm text-muted-foreground">
                        {addresses.length} paradas • 15.2 km • 45 min estimado
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRecalculateRoute}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {onStartRoute && (
                <Button onClick={onStartRoute} className="w-full" size="lg">
                  <Play className="mr-2 h-5 w-5" />
                  Iniciar Recorrido
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Address List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Direcciones</CardTitle>
          <CardDescription>Orden optimizado para la ruta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {addressesWithCoords.map((address, index) => (
              <div
                key={address.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  selectedAddress?.id === address.id ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                    index === 0 ? "bg-green-500" : index === addresses.length - 1 ? "bg-red-500" : "bg-primary"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{address.street}</p>
                  <p className="text-xs text-muted-foreground">
                    {address.city} {address.zipCode && `• ${address.zipCode}`}
                  </p>
                  {address.notes && <p className="text-xs text-muted-foreground italic mt-1">{address.notes}</p>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {index === 0 ? "Inicio" : index === addresses.length - 1 ? "Final" : `Parada ${index}`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
