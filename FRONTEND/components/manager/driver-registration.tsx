"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useNotifications } from "@/components/notifications/notification-context"
import { useAuth } from "@/components/auth-context"
import { Search, UserPlus, ArrowLeft, User, Mail, Phone, MapPin, CheckCircle, Clock } from "lucide-react"

interface Driver {
  id: string
  name: string
  email: string
  phone: string
  location: string
  status: "available" | "linked" | "busy"
}

interface DriverRegistrationProps {
  onBack: () => void
  onDriverLinked: (driver: Driver) => void
}

export function DriverRegistration({ onBack, onDriverLinked }: DriverRegistrationProps) {
  const [searchId, setSearchId] = useState("")
  const [foundDriver, setFoundDriver] = useState<Driver | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [linkingStatus, setLinkingStatus] = useState<"pending" | "accepted" | "rejected" | null>(null)
  const { toast } = useToast()
  const { sendLinkingRequest, getLinkedDrivers } = useNotifications()
  const { user } = useAuth()

  const mockDrivers: Driver[] = [
    {
      id: "DRV003",
      name: "Roberto Martínez",
      email: "roberto@example.com",
      phone: "+54 11 5678-9012",
      location: "Campana, Buenos Aires",
      status: "available",
    },
    {
      id: "DRV004",
      name: "Lucía Fernández",
      email: "lucia@example.com",
      phone: "+54 11 6789-0123",
      location: "Escobar, Buenos Aires",
      status: "available",
    },
    {
      id: "DRV005",
      name: "Diego Sánchez",
      email: "diego@example.com",
      phone: "+54 11 7890-1234",
      location: "Villa Urquiza, Buenos Aires",
      status: "linked",
    },
    {
      id: "DRV006",
      name: "Carla Rodríguez",
      email: "carla@example.com",
      phone: "+54 11 8901-2345",
      location: "Belgrano, Buenos Aires",
      status: "available",
    },
    {
      id: "DRV007",
      name: "Sebastián López",
      email: "sebastian@example.com",
      phone: "+54 11 9012-3456",
      location: "Recoleta, Buenos Aires",
      status: "busy",
    },
  ]

  const linkedDrivers = getLinkedDrivers()

  const handleSearch = async () => {
    if (!searchId.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un ID de conductor para buscar",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const driver = mockDrivers.find((d) => d.id.toLowerCase() === searchId.toLowerCase())

    if (driver) {
      // Check if already linked
      const isAlreadyLinked = linkedDrivers.some((linked) => linked.id === driver.id)
      if (isAlreadyLinked) {
        setFoundDriver({ ...driver, status: "linked" })
      } else {
        setFoundDriver(driver)
      }

      toast({
        title: "Conductor encontrado",
        description: `Se encontró el conductor ${driver.name}`,
      })
    } else {
      setFoundDriver(null)
      toast({
        title: "Conductor no encontrado",
        description: "No se encontró ningún conductor con ese ID",
        variant: "destructive",
      })
    }

    setIsSearching(false)
  }

  const handleLinkDriver = async () => {
    if (!foundDriver || !user) return

    const isAlreadyLinked = linkedDrivers.some((linked) => linked.id === foundDriver.id)
    if (isAlreadyLinked) {
      toast({
        title: "Error",
        description: "Este conductor ya está vinculado contigo",
        variant: "destructive",
      })
      return
    }

    if (foundDriver.status === "linked") {
      toast({
        title: "Error",
        description: "Este conductor ya está vinculado con otro gestor",
        variant: "destructive",
      })
      return
    }

    setIsLinking(true)
    setLinkingStatus("pending")

    try {
      // Send linking request to driver
      const success = await sendLinkingRequest(foundDriver.id, {
        id: user.id,
        name: user.name,
        email: user.email,
      })

      if (success) {
        toast({
          title: "Solicitud enviada",
          description: `Se ha enviado la solicitud de vinculación a ${foundDriver.name}`,
        })

        // Simulate waiting for driver response
        setTimeout(() => {
          // Simulate driver response (70% acceptance rate for demo)
          const accepted = Math.random() > 0.3

          if (accepted) {
            setLinkingStatus("accepted")
            const linkedDriver = { ...foundDriver, status: "linked" as const }
            onDriverLinked(linkedDriver)
            toast({
              title: "Vinculación aceptada",
              description: `${foundDriver.name} ha aceptado la vinculación`,
            })
          } else {
            setLinkingStatus("rejected")
            toast({
              title: "Vinculación rechazada",
              description: `${foundDriver.name} ha rechazado la vinculación`,
              variant: "destructive",
            })
          }
          setIsLinking(false)
        }, 3000)
      } else {
        throw new Error("Failed to send request")
      }
    } catch (error) {
      setIsLinking(false)
      setLinkingStatus(null)
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud de vinculación",
        variant: "destructive",
      })
    }
  }

  const handleTryAgain = () => {
    setFoundDriver(null)
    setSearchId("")
    setLinkingStatus(null)
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
          <h1 className="text-xl font-sans font-bold">Registrar Conductor</h1>
          <p className="text-sm text-muted-foreground">Busca y vincula un conductor por su ID</p>
        </div>
      </div>

      {/* Current Linked Drivers */}
      {linkedDrivers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conductores Vinculados</CardTitle>
            <CardDescription>Conductores que ya están bajo tu gestión</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {linkedDrivers.map((driver) => (
                <div key={driver.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{driver.name}</p>
                    <p className="text-xs text-muted-foreground">{driver.email}</p>
                  </div>
                  <Badge variant="default" className="text-xs">
                    Vinculado
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Conductor
          </CardTitle>
          <CardDescription>Ingresa el ID del conductor que deseas vincular</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="driverId">ID del Conductor</Label>
            <div className="flex gap-2">
              <Input
                id="driverId"
                placeholder="Ej: DRV003"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                disabled={isLinking}
              />
              <Button onClick={handleSearch} disabled={isSearching || isLinking}>
                {isSearching ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>IDs de ejemplo para probar: DRV003, DRV004, DRV005, DRV006, DRV007</p>
          </div>
        </CardContent>
      </Card>

      {/* Driver Found */}
      {foundDriver && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Conductor Encontrado
              </span>
              <Badge
                variant={
                  foundDriver.status === "available"
                    ? "default"
                    : foundDriver.status === "linked"
                      ? "secondary"
                      : "destructive"
                }
              >
                {foundDriver.status === "available"
                  ? "Disponible"
                  : foundDriver.status === "linked"
                    ? "Ya vinculado"
                    : "Ocupado"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{foundDriver.name}</p>
                  <p className="text-sm text-muted-foreground">ID: {foundDriver.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{foundDriver.email}</p>
                  <p className="text-sm text-muted-foreground">Correo electrónico</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{foundDriver.phone}</p>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{foundDriver.location}</p>
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                </div>
              </div>
            </div>

            {foundDriver.status === "available" && !linkingStatus && (
              <Button onClick={handleLinkDriver} disabled={isLinking} className="w-full" size="lg">
                <UserPlus className="mr-2 h-5 w-5" />
                Vincular Conductor
              </Button>
            )}

            {linkedDrivers.some((linked) => linked.id === foundDriver.id) && (
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-primary">Ya vinculado</p>
                <p className="text-xs text-muted-foreground">Este conductor ya está bajo tu gestión.</p>
              </div>
            )}

            {foundDriver.status === "linked" && !linkedDrivers.some((linked) => linked.id === foundDriver.id) && (
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Este conductor ya está vinculado con otro gestor y no está disponible.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Linking Process Status */}
      {linkingStatus && (
        <Card
          className={`${
            linkingStatus === "accepted"
              ? "bg-primary/5 border-primary/20"
              : linkingStatus === "rejected"
                ? "bg-destructive/5 border-destructive/20"
                : "bg-muted/50"
          }`}
        >
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              {linkingStatus === "pending" && (
                <>
                  <div className="animate-pulse">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  </div>
                  <p className="font-medium">Esperando respuesta del conductor</p>
                  <p className="text-sm text-muted-foreground">
                    {foundDriver?.name} recibirá una notificación para aceptar o rechazar la vinculación
                  </p>
                </>
              )}

              {linkingStatus === "accepted" && (
                <>
                  <CheckCircle className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="font-medium text-primary">¡Vinculación exitosa!</p>
                  <p className="text-sm text-muted-foreground">
                    {foundDriver?.name} ha aceptado la vinculación y ahora está bajo tu gestión.
                  </p>
                  <Button onClick={onBack} className="mt-4">
                    Volver al Dashboard
                  </Button>
                </>
              )}

              {linkingStatus === "rejected" && (
                <>
                  <div className="h-8 w-8 bg-destructive rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-destructive-foreground text-lg">×</span>
                  </div>
                  <p className="font-medium text-destructive">Vinculación rechazada</p>
                  <p className="text-sm text-muted-foreground">
                    {foundDriver?.name} ha rechazado la solicitud de vinculación.
                  </p>
                  <Button onClick={handleTryAgain} variant="outline" className="mt-4 bg-transparent">
                    Buscar otro conductor
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
