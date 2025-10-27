"use client"
import { useState, useEffect } from "react"
import { useNotifications } from "@/components/notifications/notification-context"
import { useAuth } from "@/components/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Bell, UserPlus, Route, Check, X, Clock } from "lucide-react"

export function DriverNotifications() {
  const { user } = useAuth()
  const { linkingRequests, routeAssignments, respondToLinkingRequest, respondToRouteAssignment, clearNotification } =
    useNotifications()
  const { toast } = useToast()
  const [showNotifications, setShowNotifications] = useState(false)

  const pendingLinkingRequests = linkingRequests.filter((req) => req.status === "pending")
  const pendingRouteAssignments = routeAssignments.filter((assign) => assign.status === "assigned")
  const totalPending = pendingLinkingRequests.length + pendingRouteAssignments.length

  useEffect(() => {
    if (totalPending > 0) {
      setShowNotifications(true)
    }
  }, [totalPending])

  const handleLinkingResponse = (requestId: string, accepted: boolean) => {
    respondToLinkingRequest(requestId, accepted)

    toast({
      title: accepted ? "Vinculación aceptada" : "Vinculación rechazada",
      description: accepted ? "Ahora estás vinculado con el gestor" : "Has rechazado la solicitud de vinculación",
    })

    if (pendingLinkingRequests.length === 1 && pendingRouteAssignments.length === 0) {
      setShowNotifications(false)
    }
  }

  const handleRouteResponse = (assignmentId: string, accepted: boolean) => {
    respondToRouteAssignment(assignmentId, accepted)

    toast({
      title: accepted ? "Ruta aceptada" : "Ruta rechazada",
      description: accepted ? "La ruta ha sido agregada a tu lista" : "Has rechazado la asignación de ruta",
    })

    if (pendingRouteAssignments.length === 1 && pendingLinkingRequests.length === 0) {
      setShowNotifications(false)
    }
  }

  const handleDismissNotification = (id: string, type: "linking" | "route") => {
    clearNotification(id, type)
    if (totalPending === 1) {
      setShowNotifications(false)
    }
  }

  if (!user || user.role !== "driver" || !showNotifications || totalPending === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificaciones
              <Badge className="bg-primary text-primary-foreground ml-auto">{totalPending}</Badge>
            </CardTitle>
            <CardDescription>Tienes solicitudes pendientes</CardDescription>
          </CardHeader>
        </Card>

        {/* Linking Requests */}
        {pendingLinkingRequests.map((request) => (
          <Card key={request.id} className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="h-5 w-5" />
                Solicitud de Vinculación
              </CardTitle>
              <CardDescription>{request.managerName} quiere vincularse contigo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Gestor:</strong> {request.managerName}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> {request.managerEmail}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {request.timestamp.toLocaleString()}
                </p>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">¿Desea vincularse con este gestor?</p>
                <p className="text-xs text-muted-foreground">
                  Al aceptar, este gestor podrá asignarte rutas y ver el historial de las entregas que realices para él.
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleLinkingResponse(request.id, true)} className="flex-1" size="sm">
                  <Check className="mr-2 h-4 w-4" />
                  Aceptar
                </Button>
                <Button
                  onClick={() => handleLinkingResponse(request.id, false)}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Route Assignments */}
        {pendingRouteAssignments.map((assignment) => (
          <Card key={assignment.id} className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Route className="h-5 w-5" />
                Ruta Asignada
              </CardTitle>
              <CardDescription>{assignment.managerName} te ha asignado una nueva ruta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Gestor:</strong> {assignment.managerName}
                </p>
                <p className="text-sm">
                  <strong>Direcciones:</strong> {assignment.addresses.length} paradas
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {assignment.assignedAt.toLocaleString()}
                </p>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg max-h-32 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Direcciones:</p>
                <div className="space-y-1">
                  {assignment.addresses.slice(0, 3).map((addr, index) => (
                    <p key={index} className="text-xs text-muted-foreground">
                      {index + 1}. {addr.street}, {addr.city}
                    </p>
                  ))}
                  {assignment.addresses.length > 3 && (
                    <p className="text-xs text-muted-foreground italic">... y {assignment.addresses.length - 3} más</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleRouteResponse(assignment.id, true)} className="flex-1" size="sm">
                  <Check className="mr-2 h-4 w-4" />
                  Aceptar Ruta
                </Button>
                <Button
                  onClick={() => handleRouteResponse(assignment.id, false)}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  Rechazar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Close All */}
        <Button onClick={() => setShowNotifications(false)} variant="outline" className="w-full">
          Cerrar Notificaciones
        </Button>
      </div>
    </div>
  )
}
