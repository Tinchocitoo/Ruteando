"use client"
import { useState } from "react"
import { useAuth } from "@/components/auth-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Truck, Menu, User, Shield } from "lucide-react"

interface AppHeaderProps {
  onProfileClick: () => void
}

export function AppHeader({ onProfileClick }: AppHeaderProps) {
  const { user } = useAuth()
  const [isDriverMode, setIsDriverMode] = useState(user?.role === "driver")

  if (!user) return null

  return (
    <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/ruteando-logo.png" alt="Ruteando" className="h-8 w-8 object-contain" />
        <span className="font-sans font-semibold text-lg" style={{ color: "#0A2342" }}>
          Ruteando
        </span>
      </div>

      {/* Greeting */}
      <div className="flex-1 text-center">
        <p className="font-serif text-sm text-foreground">¡Hola, {user.name}!</p>
      </div>

      {/* Hamburger Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 justify-center">
              {isDriverMode ? (
                <>
                  <Truck className="h-5 w-5" />
                  Modo Conductor
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  Modo Gestor
                </>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-3 flex flex-col items-center">
              <Label className="text-sm font-medium">Cambiar modo</Label>
              <Select
                value={isDriverMode ? "driver" : "manager"}
                onValueChange={(value) => setIsDriverMode(value === "driver")}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="driver">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Conductor
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Gestor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex justify-center">
              <Button variant="outline" className="w-48 justify-center bg-transparent" onClick={onProfileClick}>
                <User className="mr-2 h-4 w-4" />
                Ver Perfil
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
