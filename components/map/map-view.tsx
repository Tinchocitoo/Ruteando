"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin, Route, Play, RotateCcw } from "lucide-react"
import { Address } from "@/types/address"

interface MapViewProps {
  addresses: Address[]
  onBack: () => void
  onStartRoute?: () => void
  showRouteControls?: boolean
}

const DEFAULT_CENTER = { lat: -34.6037, lng: -58.3816 } // Buenos Aires

declare global {
  interface Window {
    google: typeof google
  }
}

export function MapView({
  addresses,
  onBack,
  onStartRoute,
  showRouteControls = true,
}: MapViewProps) {
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [routeCalculated, setRouteCalculated] = useState(false)
  const [startAddressId, setStartAddressId] = useState<string | null>(null)
  const [distance, setDistance] = useState<string>("")
  const [duration, setDuration] = useState<string>("")
  const [addressesWithCoords, setAddressesWithCoords] = useState<Address[]>(addresses)

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const routePolylineRef = useRef<google.maps.Polyline | null>(null)

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const toLatLngLiteral = (coords: { latitude: number; longitude: number }) => ({
    lat: coords.latitude,
    lng: coords.longitude,
  })

  // Cargar Google Maps solo una vez
  useEffect(() => {
    if (typeof window === "undefined") return

    if (window.google?.maps) {
      initMap()
      return
    }

    if (!googleMapsApiKey) {
      console.error("Falta la API Key de Google Maps")
      return
    }

    if (document.querySelector("#google-maps-script")) {
      initMap()
      return
    }

    const script = document.createElement("script")
    script.id = "google-maps-script"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,geometry`
    script.async = true
    script.defer = true
    script.onload = () => initMap()
    document.head.appendChild(script)
  }, [googleMapsApiKey])

  // Inicializar mapa (modo claro)
  const initMap = () => {
    if (!mapRef.current) return
    const googleMaps = window.google.maps

    mapInstanceRef.current = new googleMaps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })

    // Agregar marcadores
    if (addresses.length > 0) {
      const bounds = new googleMaps.LatLngBounds()
      addresses.forEach((addr) => {
        if (addr.coordinates) {
          const marker = new googleMaps.Marker({
            position: toLatLngLiteral(addr.coordinates),
            map: mapInstanceRef.current!,
            title: addr.street,
          })
          bounds.extend(marker.getPosition()!)
        }
      })
      mapInstanceRef.current.fitBounds(bounds)
    }
  }

  // Cargar geometry si no está disponible
  const ensureGeometryLoaded = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google?.maps?.geometry?.encoding) {
        resolve()
        return
      }

      const existing = document.querySelector("#google-geometry-script")
      if (existing) {
        existing.addEventListener("load", () => resolve())
        return
      }

      const script = document.createElement("script")
      script.id = "google-geometry-script"
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=geometry`
      script.async = true
      script.defer = true
      script.onload = () => {
        if (window.google?.maps?.geometry?.encoding) resolve()
        else reject(new Error("No se pudo inicializar geometry."))
      }
      script.onerror = () => reject(new Error("Error al cargar geometry.js"))
      document.head.appendChild(script)
    })
  }

  // 🧭 Dibujar polyline de forma segura
  const drawPolyline = (path: google.maps.LatLng[]) => {
    // Asegurar que el mapa está listo
    if (!mapInstanceRef.current || !(mapInstanceRef.current instanceof window.google.maps.Map)) {
      console.warn("El mapa aún no está listo. Reintentando en 300ms...")
      setTimeout(() => drawPolyline(path), 300)
      return
    }

    // Eliminar la ruta anterior si existe
    if (routePolylineRef.current) routePolylineRef.current.setMap(null)

    // Crear la nueva línea
    routePolylineRef.current = new window.google.maps.Polyline({
      path,
      strokeColor: "#1e40af",
      strokeOpacity: 0.9,
      strokeWeight: 5,
      geodesic: true,
    })

    // Asignar el mapa solo si es válido
    try {
      routePolylineRef.current.setMap(mapInstanceRef.current)
    } catch (err) {
      console.error("Error al asignar el mapa a la polyline:", err)
    }
  }

  // 🚗 Calcular ruta optimizada
  const handleCalculateRoute = async () => {
    if (!mapInstanceRef.current) {
      alert("El mapa todavía no se ha inicializado.")
      return
    }

    const validAddresses = addresses.filter((a) => a.coordinates)
    if (validAddresses.length < 2) {
      alert("Se necesitan al menos dos direcciones válidas para calcular la ruta.")
      return
    }

    const start =
      validAddresses.find((a) => a.id === startAddressId) ?? validAddresses[0]
    const others = validAddresses.filter((a) => a.id !== start.id)
    const destination = others[others.length - 1]

    setIsCalculatingRoute(true)

    try {
      const body = {
        origin: { location: { latLng: start.coordinates } },
        destination: { location: { latLng: destination.coordinates } },
        intermediates: others
          .slice(0, -1)
          .map((a) => ({ location: { latLng: a.coordinates! } })),
        travelMode: "DRIVE",
        computeAlternativeRoutes: false,
        optimizeWaypointOrder: true,
      }

      const response = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": googleMapsApiKey!,
            "X-Goog-FieldMask":
              "routes.optimizedIntermediateWaypointIndex,routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
          },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Respuesta de Google:", errorText)
        throw new Error(`Error ${response.status}`)
      }

      const data = await response.json()
      const route = data.routes?.[0]
      if (!route) throw new Error("No se encontró ninguna ruta válida.")

      await ensureGeometryLoaded()

      const path = window.google.maps.geometry.encoding.decodePath(
        route.polyline.encodedPolyline
      )
      drawPolyline(path)

      const order = route.optimizedIntermediateWaypointIndex ?? []
      const optimized = [start, ...order.map((i: number) => others[i]), destination]

      setAddressesWithCoords(optimized)
      setRouteCalculated(true)
      setDistance((route.distanceMeters / 1000).toFixed(1) + " km")
      setDuration(Math.round(route.duration / 60) + " min")
    } catch (err) {
      console.error("Error al calcular la ruta optimizada:", err)
      alert("No se pudo calcular la ruta optimizada. Revisá la consola.")
    } finally {
      setIsCalculatingRoute(false)
    }
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
          <h1 className="text-xl font-bold">Mapa de Entregas</h1>
          <p className="text-sm text-muted-foreground">
            {addresses.length} direcciones cargadas{" "}
            {routeCalculated && "• Ruta optimizada"}
          </p>
        </div>
      </div>

      {/* Mapa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 rgb(0, 27, 78)">
            <MapPin className="h-5 w-5" />
            Vista del Mapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={mapRef} className="h-[500px] w-full rounded-lg border" />
        </CardContent>
      </Card>

      {/* Punto de inicio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base rgb(0, 27, 78)">
            Seleccioná el punto de inicio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {addresses.map((a) => (
            <label
              key={a.id}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={startAddressId === a.id}
                onChange={() => setStartAddressId(a.id)}
              />
              {a.street}
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Controles */}
      {showRouteControls && (
        <div className="space-y-4">
          {!routeCalculated ? (
            <Button
              onClick={handleCalculateRoute}
              disabled={isCalculatingRoute}
              className="w-full rgb(0, 27, 78) hover:rgba(0, 41, 117, 1) text-white"
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
              <Card className="rgb(0, 27, 78) hover:rgba(0, 41, 117, 1)">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium rgb(0, 27, 78)">Ruta Optimizada</p>
                      <p className="text-sm text-gray-600">
                        {addresses.length} paradas • {distance} • {duration}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rgb(0, 27, 78) hover:rgba(0, 41, 117, 1)"
                      onClick={handleRecalculateRoute}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {onStartRoute && (
                <Button
                  onClick={() => {
                    const coords = addressesWithCoords
                      .filter((a) => a.coordinates)
                      .map((a) => toLatLngLiteral(a.coordinates!))
                    if (coords.length < 2) {
                      alert("Se necesitan al menos dos puntos para iniciar la navegación.")
                      return
                    }

                    const origin = `${coords[0].lat},${coords[0].lng}`
                    const destination = `${coords[coords.length - 1].lat},${coords[coords.length - 1].lng}`
                    const waypoints = coords
                      .slice(1, -1)
                      .map((c) => `${c.lat},${c.lng}`)
                      .join("|")

                    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${
                      waypoints ? `&waypoints=${waypoints}` : ""
                    }&travelmode=driving`
                    window.open(url, "_blank")
                    onStartRoute?.()
                  }}
                  className="w-full rgb(0, 27, 78) hover:rgba(0, 41, 117, 1) text-white"
                  size="lg"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Iniciar Recorrido
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
