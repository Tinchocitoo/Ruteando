"use client"
import { Button } from "@/components/ui/button"
import { Home, User } from "lucide-react"

interface AppFooterProps {
  onHomeClick: () => void
  onProfileClick: () => void
}

export function AppFooter({ onHomeClick, onProfileClick }: AppFooterProps) {
  return (
    <footer className="bg-card border-t border-border px-4 py-3 flex items-center justify-around">
      <Button variant="ghost" size="sm" onClick={onHomeClick} className="flex items-center gap-2">
        <Home className="h-5 w-5" />
        <span className="text-sm">Inicio</span>
      </Button>

      <Button variant="ghost" size="sm" onClick={onProfileClick} className="flex items-center gap-2">
        <User className="h-5 w-5" />
        <span className="text-sm">Perfil</span>
      </Button>
    </footer>
  )
}
