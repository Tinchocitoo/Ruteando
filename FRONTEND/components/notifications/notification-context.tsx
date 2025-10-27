"use client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "@/components/auth-context"

interface LinkingRequest {
  id: string
  managerId: string
  managerName: string
  managerEmail: string
  timestamp: Date
  status: "pending" | "accepted" | "rejected"
}

interface RouteAssignment {
  id: string
  managerId: string
  managerName: string
  addresses: any[]
  assignedAt: Date
  status: "assigned" | "accepted" | "rejected"
}

interface NotificationContextType {
  linkingRequests: LinkingRequest[]
  routeAssignments: RouteAssignment[]
  sendLinkingRequest: (driverId: string, managerInfo: { id: string; name: string; email: string }) => Promise<boolean>
  respondToLinkingRequest: (requestId: string, accepted: boolean) => void
  assignRouteToDriver: (driverId: string, addresses: any[], managerInfo: { id: string; name: string }) => void
  respondToRouteAssignment: (assignmentId: string, accepted: boolean) => void
  clearNotification: (id: string, type: "linking" | "route") => void
  getLinkedManagers: () => { id: string; name: string; email: string }[]
  getLinkedDrivers: () => { id: string; name: string; email: string }[]
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [linkingRequests, setLinkingRequests] = useState<LinkingRequest[]>([])
  const [routeAssignments, setRouteAssignments] = useState<RouteAssignment[]>([])
  const [linkedRelationships, setLinkedRelationships] = useState<
    {
      driverId: string
      managerId: string
      driverName: string
      managerName: string
      driverEmail: string
      managerEmail: string
    }[]
  >([])

  // Load stored data on mount
  useEffect(() => {
    if (user) {
      const storedRequests = localStorage.getItem(`linkingRequests_${user.id}`)
      const storedAssignments = localStorage.getItem(`routeAssignments_${user.id}`)
      const storedRelationships = localStorage.getItem("linkedRelationships")

      if (storedRequests) {
        setLinkingRequests(
          JSON.parse(storedRequests).map((req: any) => ({ ...req, timestamp: new Date(req.timestamp) })),
        )
      }
      if (storedAssignments) {
        setRouteAssignments(
          JSON.parse(storedAssignments).map((assign: any) => ({ ...assign, assignedAt: new Date(assign.assignedAt) })),
        )
      }
      if (storedRelationships) {
        setLinkedRelationships(JSON.parse(storedRelationships))
      }
    }
  }, [user])

  // Save data when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`linkingRequests_${user.id}`, JSON.stringify(linkingRequests))
    }
  }, [linkingRequests, user])

  useEffect(() => {
    if (user) {
      localStorage.setItem(`routeAssignments_${user.id}`, JSON.stringify(routeAssignments))
    }
  }, [routeAssignments, user])

  useEffect(() => {
    localStorage.setItem("linkedRelationships", JSON.stringify(linkedRelationships))
  }, [linkedRelationships])

  const sendLinkingRequest = async (
    driverId: string,
    managerInfo: { id: string; name: string; email: string },
  ): Promise<boolean> => {
    // Simulate sending request to driver
    const request: LinkingRequest = {
      id: `link-${Date.now()}`,
      managerId: managerInfo.id,
      managerName: managerInfo.name,
      managerEmail: managerInfo.email,
      timestamp: new Date(),
      status: "pending",
    }

    // Add to driver's notifications (simulate cross-user notification)
    const driverRequests = JSON.parse(localStorage.getItem(`linkingRequests_${driverId}`) || "[]")
    driverRequests.push(request)
    localStorage.setItem(`linkingRequests_${driverId}`, JSON.stringify(driverRequests))

    return true
  }

  const respondToLinkingRequest = (requestId: string, accepted: boolean) => {
    setLinkingRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, status: accepted ? "accepted" : "rejected" } : req)),
    )

    if (accepted && user) {
      const request = linkingRequests.find((req) => req.id === requestId)
      if (request) {
        // Create linked relationship
        const newRelationship = {
          driverId: user.id,
          managerId: request.managerId,
          driverName: user.name,
          managerName: request.managerName,
          driverEmail: user.email,
          managerEmail: request.managerEmail,
        }
        setLinkedRelationships((prev) => [...prev, newRelationship])
      }
    }
  }

  const assignRouteToDriver = (driverId: string, addresses: any[], managerInfo: { id: string; name: string }) => {
    const assignment: RouteAssignment = {
      id: `route-${Date.now()}`,
      managerId: managerInfo.id,
      managerName: managerInfo.name,
      addresses,
      assignedAt: new Date(),
      status: "assigned",
    }

    // Add to driver's route assignments
    const driverAssignments = JSON.parse(localStorage.getItem(`routeAssignments_${driverId}`) || "[]")
    driverAssignments.push(assignment)
    localStorage.setItem(`routeAssignments_${driverId}`, JSON.stringify(driverAssignments))
  }

  const respondToRouteAssignment = (assignmentId: string, accepted: boolean) => {
    setRouteAssignments((prev) =>
      prev.map((assign) =>
        assign.id === assignmentId ? { ...assign, status: accepted ? "accepted" : "rejected" } : assign,
      ),
    )
  }

  const clearNotification = (id: string, type: "linking" | "route") => {
    if (type === "linking") {
      setLinkingRequests((prev) => prev.filter((req) => req.id !== id))
    } else {
      setRouteAssignments((prev) => prev.filter((assign) => assign.id !== id))
    }
  }

  const getLinkedManagers = () => {
    if (!user || user.role !== "driver") return []
    return linkedRelationships
      .filter((rel) => rel.driverId === user.id)
      .map((rel) => ({ id: rel.managerId, name: rel.managerName, email: rel.managerEmail }))
  }

  const getLinkedDrivers = () => {
    if (!user || user.role !== "manager") return []
    return linkedRelationships
      .filter((rel) => rel.managerId === user.id)
      .map((rel) => ({ id: rel.driverId, name: rel.driverName, email: rel.driverEmail }))
  }

  return (
    <NotificationContext.Provider
      value={{
        linkingRequests,
        routeAssignments,
        sendLinkingRequest,
        respondToLinkingRequest,
        assignRouteToDriver,
        respondToRouteAssignment,
        clearNotification,
        getLinkedManagers,
        getLinkedDrivers,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
