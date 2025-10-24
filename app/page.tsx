"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MapPin, Home, History, Settings } from "lucide-react"

import { MapView } from "@/components/map/map-view"
import { RouteNavigation } from "@/components/driver/route-navigation"
import { DriverDashboard } from "@/components/driver/driver-dashboard"

import { Address } from "@/types/address"

type View =
  | "loading"
  | "dashboard"
  | "map-view"
  | "route-navigation"
  | "history"
  | "settings"

export default function Page() {
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState<View>("loading")
  const [addresses, setAddresses] = useState<Address[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])

  // 🧠 Carga inicial (direcciones e historial)
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const savedAddresses = localStorage.getItem("ruteando.addresses")
        const savedHistory = localStorage.getItem("ruteando.history")
        if (savedAddresses) setAddresses(JSON.parse(savedAddresses))
        if (savedHistory) setDeliveries(JSON.parse(savedHistory))
      }
    } catch {
      // ignorar errores de parseo
    } finally {
      setIsLoading(false)
      setCurrentView("dashboard")
    }
  }, [])

  // 💾 Persistir direcciones si cambian
  useEffect(() => {
    try {
      localStorage.setItem("ruteando.addresses", JSON.stringify(addresses))
    } catch {}
  }, [addresses])

  // 💾 Persistir historial si cambia
  useEffect(() => {
    try {
      localStorage.setItem("ruteando.history", JSON.stringify(deliveries))
    } catch {}
  }, [deliveries])

  // --- Navegación global ---
  const handleViewMap = () => setCurrentView("map-view")
  const handleHomeClick = () => setCurrentView("dashboard")
  const handleHistoryClick = () => setCurrentView("history")
  const handleSettingsClick = () => setCurrentView("settings")

  // --- MapView → inicia recorrido
  const handleStartRoute = () => setCurrentView("route-navigation")

  // --- RouteNavigation → recorrido completado
  const handleRouteComplete = (summary: { completed: Address[]; failed: Address[]; date: string }) => {
    setDeliveries((prev) => [...prev, summary])
    setCurrentView("dashboard")
  }

  // --- Dashboard → carga direcciones
  const handleAddressesLoaded = (addressesList: Address[]) => {
    setAddresses(addressesList)
    setCurrentView("map-view")
  }

  // Pantalla de carga inicial
  if (isLoading) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <Card>
          <CardContent className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm text-muted-foreground">Cargando Ruteando…</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  // --- Renderizado principal ---
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      {/* NAV SUPERIOR */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={currentView === "dashboard" ? "default" : "outline"}
          onClick={handleHomeClick}
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          Inicio
        </Button>
        <Button
          variant={currentView === "map-view" ? "default" : "outline"}
          onClick={handleViewMap}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          Mapa
        </Button>
        <Button
          variant={currentView === "history" ? "default" : "outline"}
          onClick={handleHistoryClick}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          Historial
        </Button>
        <Button
          variant={currentView === "settings" ? "default" : "outline"}
          onClick={handleSettingsClick}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Configuración
        </Button>
      </div>

      {/* VISTAS PRINCIPALES */}
      {currentView === "dashboard" && (
        <div className="space-y-6">
          <DriverDashboard
            onLoadAddresses={handleAddressesLoaded}
            onViewMap={handleViewMap}
            deliveries={deliveries}
          />
        </div>
      )}

      {currentView === "map-view" && (
        <MapView
          addresses={addresses}
          onBack={handleHomeClick}
          onStartRoute={handleStartRoute}
          showRouteControls
        />
      )}

      {currentView === "route-navigation" && (
        <RouteNavigation
          addresses={addresses}
          onBack={handleViewMap}
          onComplete={handleRouteComplete}
        />
      )}

      {currentView === "history" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-sans font-bold">Historial de Recorridos</h1>
            <p className="text-sm text-muted-foreground">Tus rutas completadas y fallidas</p>
          </div>

          {deliveries.length > 0 ? (
            deliveries.map((route, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle>
                    Recorrido {i + 1} — {route.date}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Completadas */}
                  <p className="font-medium text-green-600 mb-1">
                    Entregas completadas ({route.completed.length})
                  </p>
                  <ul className="text-sm mb-3 space-y-1">
                    {route.completed.map((a: Address) => (
                      <li key={a.id}>✅ {a.street}</li>
                    ))}
                  </ul>

                  {/* Fallidas */}
                  <p className="font-medium text-red-600 mb-1">
                    Entregas fallidas ({route.failed.length})
                  </p>
                  <ul className="text-sm space-y-1">
                    {route.failed.map((a: Address) => (
                      <li key={a.id}>❌ {a.street}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Aún no registraste recorridos.  
                Comenzá cargando direcciones desde el panel principal 🚚
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {currentView === "settings" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-sans font-bold">Configuración</h1>
            <p className="text-sm text-muted-foreground">Preferencias de tu cuenta y de la app</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Próximamente: ajustes de notificaciones, permisos y más
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
