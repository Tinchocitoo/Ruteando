"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Users, Shield, TrendingUp } from "lucide-react"

interface LinkedDriver {
  id: string
  name: string
  email: string
  status: "active" | "inactive"
  assignedRoutes: number
  completedDeliveries: number
}

interface ManagerDashboardProps {
  onRegisterDriver: () => void
  onViewDrivers: () => void
}

export function ManagerDashboard({ onRegisterDriver, onViewDrivers }: ManagerDashboardProps) {
  const [linkedDrivers] = useState<LinkedDriver[]>([
    {
      id: "DRV001",
      name: "Carlos Mendoza",
      email: "carlos@example.com",
      status: "active",
      assignedRoutes: 3,
      completedDeliveries: 45,
    },
    {
      id: "DRV002",
      name: "Ana García",
      email: "ana@example.com",
      status: "active",
      assignedRoutes: 2,
      completedDeliveries: 32,
    },
  ])

  const activeDrivers = linkedDrivers.filter((d) => d.status === "active").length
  const totalRoutes = linkedDrivers.reduce((sum, d) => sum + d.assignedRoutes, 0)
  const totalDeliveries = linkedDrivers.reduce((sum, d) => sum + d.completedDeliveries, 0)

  return (
    <div className="space-y-6">
      {/* Manager Overview */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="bg-primary rounded-full p-3">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-sans font-bold">Panel de Gestión</h1>
        <p className="text-foreground font-serif">Administra conductores y rutas</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-primary">{activeDrivers}</div>
              <p className="text-sm text-foreground">Conductores Activos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-secondary">{totalRoutes}</div>
              <p className="text-sm text-foreground">Rutas Asignadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-accent">{totalDeliveries}</div>
              <p className="text-sm text-foreground">Entregas Totales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-sans font-semibold">Acciones Principales</h2>

        {/* Register Driver */}
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onRegisterDriver}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="bg-primary p-3 rounded-lg">
                <UserPlus className="h-6 w-6 text-primary-foreground" />
              </div>
              Registrar Conductor
            </CardTitle>
            <CardDescription>Buscar y vincular un nuevo conductor por ID</CardDescription>
          </CardHeader>
        </Card>

        {/* View Drivers */}
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onViewDrivers}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="bg-secondary p-3 rounded-lg">
                <Users className="h-6 w-6 text-secondary-foreground" />
              </div>
              Ver Conductores
              <Badge variant="secondary" className="ml-auto">
                {linkedDrivers.length}
              </Badge>
            </CardTitle>
            <CardDescription>Lista de conductores vinculados y su gestión</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-foreground">Carlos Mendoza completó ruta</p>
                <p className="text-xs text-foreground">Hace 2 horas • 8 entregas</p>
              </div>
              <Badge className="bg-secondary text-secondary-foreground">Completado</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-foreground">Ana García inició nueva ruta</p>
                <p className="text-xs text-foreground">Hace 4 horas • 5 entregas</p>
              </div>
              <Badge variant="outline">En progreso</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-foreground">Nueva ruta asignada a Carlos</p>
                <p className="text-xs text-foreground">Ayer • 12 entregas</p>
              </div>
              <Badge variant="secondary">Asignado</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
