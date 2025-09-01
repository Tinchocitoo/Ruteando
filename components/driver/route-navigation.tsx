"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  MapPin,
  Navigation,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Phone,
  MessageSquare,
} from "lucide-react"

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

interface RouteNavigationProps {
  addresses: Address[]
  onBack: () => void
  onRouteComplete: (deliveries: Delivery[]) => void
}

export function RouteNavigation({ addresses, onBack, onRouteComplete }: RouteNavigationProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [deliveries, setDeliveries] = useState<Delivery[]>(
    addresses.map((addr) => ({
      id: `delivery-${addr.id}`,
      address: addr,
      status: "pending",
      timestamp: new Date(),
    })),
  )
  const [deliveryNotes, setDeliveryNotes] = useState("")
  const [routeStartTime] = useState(new Date())
  const { toast } = useToast()

  const currentDelivery = deliveries[currentIndex]
  const completedCount = deliveries.filter((d) => d.status === "completed").length
  const failedCount = deliveries.filter((d) => d.status === "failed").length

  const handleDeliveryComplete = () => {
    const updatedDeliveries = [...deliveries]
    updatedDeliveries[currentIndex] = {
      ...updatedDeliveries[currentIndex],
      status: "completed",
      notes: deliveryNotes.trim() || undefined,
      timestamp: new Date(),
    }
    setDeliveries(updatedDeliveries)
    setDeliveryNotes("")

    toast({
      title: "Entrega completada",
      description: `Entrega en ${currentDelivery.address.street} marcada como completada`,
    })

    // Move to next delivery or complete route
    if (currentIndex < addresses.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Route completed
      onRouteComplete(updatedDeliveries)
    }
  }

  const handleDeliveryFailed = () => {
    const updatedDeliveries = [...deliveries]
    updatedDeliveries[currentIndex] = {
      ...updatedDeliveries[currentIndex],
      status: "failed",
      notes: deliveryNotes.trim() || undefined,
      timestamp: new Date(),
    }
    setDeliveries(updatedDeliveries)
    setDeliveryNotes("")

    toast({
      title: "Entrega fallida",
      description: `Entrega en ${currentDelivery.address.street} marcada como fallida`,
      variant: "destructive",
    })

    // Move to next delivery
    if (currentIndex < addresses.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Route completed
      onRouteComplete(updatedDeliveries)
    }
  }

  const handleRetryDelivery = () => {
    const updatedDeliveries = [...deliveries]
    updatedDeliveries[currentIndex] = {
      ...updatedDeliveries[currentIndex],
      status: "pending",
      notes: undefined,
      timestamp: new Date(),
    }
    setDeliveries(updatedDeliveries)

    toast({
      title: "Entrega reactivada",
      description: "La entrega ha sido marcada como pendiente nuevamente",
    })
  }

  const handleDeliveryPending = () => {
    const updatedDeliveries = [...deliveries]
    updatedDeliveries[currentIndex] = {
      ...updatedDeliveries[currentIndex],
      status: "pending",
      notes: deliveryNotes.trim() || undefined,
      timestamp: new Date(),
    }
    setDeliveries(updatedDeliveries)
    setDeliveryNotes("")

    toast({
      title: "Entrega pendiente",
      description: `Entrega en ${currentDelivery.address.street} marcada como pendiente`,
    })

    // Move to next delivery
    if (currentIndex < addresses.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Route completed
      onRouteComplete(updatedDeliveries)
    }
  }

  const goToDelivery = (index: number) => {
    setCurrentIndex(index)
    setDeliveryNotes("")
  }

  const getElapsedTime = () => {
    const elapsed = Math.floor((new Date().getTime() - routeStartTime.getTime()) / 1000 / 60)
    return `${elapsed} min`
  }

  if (currentIndex >= addresses.length) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary rounded-full p-4">
              <CheckCircle className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-sans font-bold">¡Ruta Completada!</h1>
          <p className="text-muted-foreground">Todas las entregas han sido procesadas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de Entregas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{completedCount}</div>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{failedCount}</div>
                <p className="text-sm text-muted-foreground">Fallidas</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">{addresses.length}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={onBack} className="w-full" size="lg">
          Volver al Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Recorrido
        </Button>
        <div>
          <h1 className="text-xl font-sans font-bold">Navegación de Ruta</h1>
          <p className="text-sm text-muted-foreground">
            Entrega {currentIndex + 1} de {addresses.length} • {getElapsedTime()} transcurridos
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Progreso de la ruta</span>
              <span>
                {completedCount + failedCount}/{addresses.length}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${((completedCount + failedCount) / addresses.length) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedCount} completadas</span>
              <span>{failedCount} fallidas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Delivery */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Entrega Actual
            </CardTitle>
            <Badge className="bg-primary text-primary-foreground">
              {currentIndex + 1} de {addresses.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="font-medium text-lg">{currentDelivery.address.street}</p>
            <p className="text-muted-foreground">
              {currentDelivery.address.city} {currentDelivery.address.zipCode && `• ${currentDelivery.address.zipCode}`}
            </p>
            {currentDelivery.address.notes && (
              <p className="text-sm text-muted-foreground italic bg-muted/50 p-2 rounded">
                {currentDelivery.address.notes}
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 bg-transparent">
              <Phone className="h-4 w-4 mr-2" />
              Llamar
            </Button>
            <Button variant="outline" size="sm" className="flex-1 bg-transparent">
              <Navigation className="h-4 w-4 mr-2" />
              Navegar
            </Button>
            <Button variant="outline" size="sm" className="flex-1 bg-transparent">
              <MessageSquare className="h-4 w-4 mr-2" />
              Mensaje
            </Button>
          </div>

          {/* Delivery Notes */}
          <div className="space-y-2">
            <Label htmlFor="delivery-notes">Observaciones de la entrega (opcional)</Label>
            <Textarea
              id="delivery-notes"
              placeholder="Ej: Entregado a portero, cliente no estaba, etc."
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Delivery Actions */}
          <div className="flex flex-col gap-3 items-center">
            <Button
              onClick={handleDeliveryComplete}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <CheckCircle className="mr-2 h-5 w-5" />
              Entrega Completada
            </Button>
            <Button
              onClick={handleDeliveryPending}
              variant="secondary"
              className="w-full bg-gray-500 hover:bg-gray-600 text-white"
              size="lg"
            >
              <Clock className="mr-2 h-5 w-5" />
              Entrega Pendiente
            </Button>
            <Button
              onClick={handleDeliveryFailed}
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700"
              size="lg"
            >
              <XCircle className="mr-2 h-5 w-5" />
              Entrega Fallida
            </Button>
          </div>

          {currentDelivery.status === "failed" && (
            <Button onClick={handleRetryDelivery} variant="outline" className="w-full bg-transparent">
              <Clock className="mr-2 h-4 w-4" />
              Reintentar Entrega
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Delivery List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Entregas</CardTitle>
          <CardDescription>Toca una entrega para ir directamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {deliveries.map((delivery, index) => (
              <div
                key={delivery.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  index === currentIndex
                    ? "bg-primary/10 border border-primary/20"
                    : index < currentIndex
                      ? "bg-muted/30"
                      : "bg-muted/50 hover:bg-muted/70"
                }`}
                onClick={() => goToDelivery(index)}
              >
                <div className="flex-shrink-0">
                  {delivery.status === "completed" ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : delivery.status === "failed" ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : index === currentIndex ? (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <ArrowRight className="h-3 w-3 text-primary-foreground" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 bg-muted-foreground rounded-full flex items-center justify-center text-white text-xs">
                      {index + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{delivery.address.street}</p>
                  <p className="text-xs text-muted-foreground">
                    {delivery.address.city} {delivery.address.zipCode && `• ${delivery.address.zipCode}`}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Badge
                    variant={
                      delivery.status === "completed"
                        ? "default"
                        : delivery.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-xs"
                  >
                    {delivery.status === "completed"
                      ? "Completada"
                      : delivery.status === "failed"
                        ? "Fallida"
                        : "Pendiente"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
