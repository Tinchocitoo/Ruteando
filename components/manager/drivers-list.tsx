"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Mail, MapPin, Route, History, Map, UserX } from "lucide-react"

interface LinkedDriver {
  id: string
  name: string
  email: string
  status: "active" | "inactive"
  assignedRoutes: number
  completedDeliveries: number
  location: string
  phone: string
}

interface DriversListProps {
  onBack: () => void
}

export function DriversList({ onBack }: DriversListProps) {
  const [selectedDriver, setSelectedDriver] = useState<LinkedDriver | null>(null)
  const [linkedDrivers] = useState<LinkedDriver[]>([
    {
      id: "DRV001",
      name: "Francisco Bergamasco",
      email: "francisco@example.com",
      phone: "+54 11 1234-5678",
      location: "Campana Centro",
      status: "active",
      assignedRoutes: 3,
      completedDeliveries: 45,
    },
    {
      id: "DRV002",
      name: "Nicole Reggiardo",
      email: "nicole@example.com",
      phone: "+54 11 2345-6789",
      location: "Cardales",
      status: "active",
      assignedRoutes: 2,
      completedDeliveries: 32,
    },
    {
      id: "DRV003",
      name: "Martín Díaz",
      email: "martin@example.com",
      phone: "+54 11 3456-7890",
      location: "Escobar",
      status: "inactive",
      assignedRoutes: 1,
      completedDeliveries: 18,
    },
    {
      id: "DRV004",
      name: "Ary Cáceres",
      email: "ary@example.com",
      phone: "+54 11 4567-8901",
      location: "Campana Centro",
      status: "active",
      assignedRoutes: 4,
      completedDeliveries: 52,
    },
  ])

  const handleDriverSelect = (driver: LinkedDriver) => {
    setSelectedDriver(driver)
  }

  const handleBackToList = () => {
    setSelectedDriver(null)
  }

  const handleAssignRoute = () => {
    console.log("Assign route to", selectedDriver?.name)
    // TODO: Implement route assignment
  }

  const handleViewAssignedRoutes = () => {
    console.log("View assigned routes for", selectedDriver?.name)
    // TODO: Implement view assigned routes
  }

  const handleViewHistory = () => {
    console.log("View delivery history for", selectedDriver?.name)
    // TODO: Implement view delivery history
  }

  const handleViewOnMap = () => {
    console.log("View on map for", selectedDriver?.name)
    // TODO: Implement map view
  }

  const handleUnlinkDriver = () => {
    console.log("Unlink driver", selectedDriver?.name)
    // TODO: Implement driver unlinking
  }

  if (selectedDriver) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBackToList}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Lista
          </Button>
          <div>
            <h1 className="text-xl font-sans font-bold">{selectedDriver.name}</h1>
            <p className="text-sm text-muted-foreground">Gestión del conductor</p>
          </div>
        </div>

        {/* Driver Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Conductor
              </span>
              <Badge variant={selectedDriver.status === "active" ? "default" : "secondary"}>
                {selectedDriver.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedDriver.name}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedDriver.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedDriver.email}</p>
                  <p className="text-sm text-muted-foreground">Correo electrónico</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedDriver.location}</p>
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-4 justify-center">
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">{selectedDriver.assignedRoutes}</div>
                <p className="text-sm text-muted-foreground">Rutas</p>
              </div>
              <div className="text-center p-3 bg-secondary/10 rounded-lg">
                <div className="text-2xl font-bold text-secondary">{selectedDriver.completedDeliveries}</div>
                <p className="text-sm text-muted-foreground">Entregas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Management Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-sans font-semibold">Acciones de Gestión</h3>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleAssignRoute}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Route className="h-5 w-5 text-primary" />
                </div>
                Asignar Ruta
              </CardTitle>
              <CardDescription>Crear y asignar una nueva ruta de entregas</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleViewAssignedRoutes}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <Map className="h-5 w-5 text-secondary" />
                </div>
                Ver Rutas Asignadas
                <Badge variant="secondary" className="ml-auto">
                  {selectedDriver.assignedRoutes}
                </Badge>
              </CardTitle>
              <CardDescription>Revisar todas las rutas asignadas a este conductor</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleViewHistory}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-accent/10 p-2 rounded-lg">
                  <History className="h-5 w-5 text-accent" />
                </div>
                Ver Historial de Entregas
              </CardTitle>
              <CardDescription>Historial de entregas de rutas asignadas por ti</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleViewOnMap}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="bg-chart-2/10 p-2 rounded-lg">
                  <MapPin className="h-5 w-5 text-chart-2" />
                </div>
                Ver en Mapa la Ruta Asignada
              </CardTitle>
              <CardDescription>Visualizar rutas activas en el mapa</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Unlink Driver */}
        <div className="flex justify-center">
          <Button variant="destructive" onClick={handleUnlinkDriver} className="w-48">
            <UserX className="mr-2 h-4 w-4" />
            Desvincular Conductor
          </Button>
        </div>
      </div>
    )
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
          <h1 className="text-xl font-sans font-bold">Conductores Vinculados</h1>
          <p className="text-sm text-muted-foreground">Lista de conductores bajo tu gestión</p>
        </div>
      </div>

      {/* Drivers List */}
      <div className="space-y-4">
        {linkedDrivers.map((driver) => (
          <Card
            key={driver.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleDriverSelect(driver)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{driver.name}</CardTitle>
                    <CardDescription>
                      ID: {driver.id} • {driver.email}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={driver.status === "active" ? "default" : "secondary"}>
                  {driver.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-primary">{driver.assignedRoutes}</div>
                  <p className="text-xs text-muted-foreground">Rutas</p>
                </div>
                <div>
                  <div className="text-lg font-semibold text-secondary">{driver.completedDeliveries}</div>
                  <p className="text-xs text-muted-foreground">Entregas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {linkedDrivers.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <User className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No tienes conductores vinculados</p>
              <p className="text-sm text-muted-foreground">
                Usa "Registrar Conductor" para vincular tu primer conductor
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
