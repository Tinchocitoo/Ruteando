"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { ProfilePage } from "@/components/profile-page"
import { AppHeader } from "@/components/layout/app-header"
import { AppFooter } from "@/components/layout/app-footer"
import { DriverDashboard } from "@/components/driver/driver-dashboard"
import { AddressLoader } from "@/components/driver/address-loader"
import { MapView } from "@/components/map/map-view"
import { RouteNavigation } from "@/components/driver/route-navigation"
import { ManagerDashboard } from "@/components/manager/manager-dashboard"
import { DriverRegistration } from "@/components/manager/driver-registration"
import { DriversList } from "@/components/manager/drivers-list"
import { DriverNotifications } from "@/components/notifications/driver-notifications"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { UserCheck, LogIn, UserPlus, ArrowLeft } from "lucide-react"

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const { login, register, isLoading } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let success = false
    if (isLogin) {
      success = await login(email, password)
    } else {
      success = await register(name, email, password)
    }

    if (success) {
      toast({
        title: isLogin ? "Bienvenido" : "Cuenta creada",
        description: isLogin ? "Has iniciado sesión correctamente" : "Tu cuenta ha sido creada exitosamente",
      })
    } else {
      toast({
        title: "Error",
        description: isLogin ? "Credenciales incorrectas" : "No se pudo crear la cuenta",
        variant: "destructive",
      })
    }
  }

  const handleDemoAccess = async (role: "driver" | "manager") => {
    const demoEmail = role === "manager" ? "manager@demo.com" : "driver@demo.com"
    const success = await login(demoEmail, "demo123")

    if (success) {
      toast({
        title: "Acceso demo",
        description: `Bienvenido al modo ${role === "manager" ? "Gestor" : "Conductor"}`,
      })
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img src="/ruteando-logo.png" alt="Ruteando Logo" className="h-16 w-16 object-contain" />
          </div>
          <h1 className="text-2xl font-sans font-bold" style={{ color: "#0A2342" }}>
            Ruteando
          </h1>
          <p className="text-muted-foreground font-serif">Gestión de entregas y rutas</p>
        </div>

        {/* Authentication Form */}
        <Card>
          <CardHeader>
            <Tabs value={isLogin ? "login" : "register"} onValueChange={(value) => setIsLogin(value === "login")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Iniciar Sesión
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Registrarse
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <CardTitle>Bienvenido de vuelta</CardTitle>
                <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
              </TabsContent>

              <TabsContent value="register">
                <CardTitle>Crear cuenta</CardTitle>
                <CardDescription>Regístrate para comenzar a usar Ruteando</CardDescription>
              </TabsContent>
            </Tabs>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Tu nombre completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLogin ? (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Iniciar Sesión
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Crear Cuenta
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Access */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground font-serif">Acceso de demostración</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => handleDemoAccess("driver")}
                  disabled={isLoading}
                >
                  Demo Conductor
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent"
                  onClick={() => handleDemoAccess("manager")}
                  disabled={isLoading}
                >
                  Demo Gestor
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const [currentView, setCurrentView] = useState<
    | "dashboard"
    | "profile"
    | "load-addresses"
    | "map-view"
    | "route-navigation"
    | "register-driver"
    | "drivers-list"
    | "delivery-history"
  >("dashboard")

  const [addresses, setAddresses] = useState<any[]>([])
  const [deliveries, setDeliveries] = useState<any[]>([])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("view") === "profile") {
      setCurrentView("profile")
    }
  }, [])

  const handleProfileClick = () => setCurrentView("profile")
  const handleHomeClick = () => setCurrentView("dashboard")
  const handleLoadAddresses = () => setCurrentView("load-addresses")
  const handleRegisterDriver = () => setCurrentView("register-driver")
  const handleViewDrivers = () => setCurrentView("drivers-list")
  const handleViewMap = () => setCurrentView("map-view")
  const handleStartRoute = () => setCurrentView("route-navigation")
  const handleViewHistory = () => setCurrentView("delivery-history")

  const handleAddressesLoaded = (loadedAddresses: any[]) => {
    setAddresses(loadedAddresses)
    setCurrentView("dashboard")
  }

  const handleDriverLinked = (driver: any) => {
    console.log("Driver linked:", driver)
    setCurrentView("dashboard")
  }

  const handleRouteComplete = (completedDeliveries: any[]) => {
    setDeliveries([...deliveries, ...completedDeliveries])
    setCurrentView("dashboard")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader onProfileClick={handleProfileClick} />

        <main className="flex-1 p-4">
          {currentView === "profile" && <ProfilePage />}
          {currentView === "load-addresses" && (
            <AddressLoader onBack={handleHomeClick} onAddressesLoaded={handleAddressesLoaded} />
          )}
          {currentView === "map-view" && (
            <MapView addresses={addresses} onBack={handleHomeClick} onStartRoute={handleStartRoute} />
          )}
          {currentView === "route-navigation" && (
            <RouteNavigation addresses={addresses} onBack={handleHomeClick} onRouteComplete={handleRouteComplete} />
          )}
          {currentView === "register-driver" && (
            <DriverRegistration onBack={handleHomeClick} onDriverLinked={handleDriverLinked} />
          )}
          {currentView === "drivers-list" && <DriversList onBack={handleHomeClick} />}
          {currentView === "delivery-history" && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleHomeClick}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
                <div>
                  <h1 className="text-xl font-sans font-bold">Historial de Entregas</h1>
                  <p className="text-sm text-muted-foreground">Todas tus entregas realizadas</p>
                </div>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground">Próximamente: Historial detallado de entregas</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {currentView === "dashboard" && (
            <>
              {user.role === "driver" ? (
                <DriverDashboard
                  onLoadAddresses={handleLoadAddresses}
                  onViewMap={handleViewMap}
                  onViewHistory={handleViewHistory}
                  addresses={addresses}
                  deliveries={deliveries}
                />
              ) : (
                <ManagerDashboard onRegisterDriver={handleRegisterDriver} onViewDrivers={handleViewDrivers} />
              )}
            </>
          )}
        </main>

        <AppFooter onHomeClick={handleHomeClick} onProfileClick={handleProfileClick} />
      </div>

      {/* Driver Notifications Overlay */}
      <DriverNotifications />
    </>
  )
}
