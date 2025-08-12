"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChecklistCard } from "@/components/checklist-card"
import { CreateChecklistDialog } from "@/components/create-checklist-dialog"
import { apiClient } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ProtectedRoute } from "@/components/protected-route"

interface Checklist {
  id: string
  name: string
  color: string
  itemCount?: number
  completedCount?: number
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [isLoadingChecklists, setIsLoadingChecklists] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      loadChecklists()
    }
  }, [isAuthenticated])

  const loadChecklists = async () => {
    try {
      setIsLoadingChecklists(true)
      const response = await apiClient.getAllChecklists()
      
      console.log("Raw checklists response:", response)
      console.log("Raw checklists data:", response.data)

      const checklistsWithCounts = await Promise.all(
        response.data.map(async (item: any, index: number) => {
          console.log(`Processing checklist ${index}:`, item)
          console.log(`Checklist ${index} raw data:`, {
            id: item.id || item.checklistId,
            name: item.name || item.title,
            color: item.color,
            rawColor: item.color
          })
          
          try {
            // Get items for this checklist to calculate counts
            const itemsResponse = await apiClient.getChecklistItems(item.id || item.checklistId)
            const items = itemsResponse.data || []
            const completedItems = items.filter(
              (i: any) => i.completed || i.status === "completed" || i.isDone || false,
            )

            const checklist = {
              id: item.id || item.checklistId,
              name: item.name || item.title || "New Checklist",
              color: item.color || "yellow",
              itemCount: items.length,
              completedCount: completedItems.length,
            }
            
            console.log(`Processed checklist ${index}:`, checklist)
            console.log(`Checklist ${index} final color:`, checklist.color)
            console.log(`Checklist ${index} raw color from API:`, item.color)
            return checklist
          } catch (err) {
            console.error(`Error processing checklist ${index}:`, err)
            // If we can't get items, just return basic info
            const checklist = {
              id: item.id || item.checklistId,
              name: item.name || item.title || "New Checklist",
              color: item.color || "yellow",
              itemCount: 0,
              completedCount: 0,
            }
            console.log(`Fallback checklist ${index}:`, checklist)
            return checklist
          }
        }),
      )

      console.log("Final processed checklists:", checklistsWithCounts)
      setChecklists(checklistsWithCounts)
      setError("")
    } catch (err) {
      setError("Failed to load checklists")
      console.error("Error loading checklists:", err)
    } finally {
      setIsLoadingChecklists(false)
    }
  }

  const handleCreateChecklist = async (name: string, color: string) => {
    try {
      console.log("Creating checklist with name:", name, "color:", color)
      const checklistData = { name, color }
      console.log("Sending checklist data to API:", checklistData)
      
      const response = await apiClient.saveChecklist(checklistData)
      console.log("API response for creating checklist:", response)
      console.log("Response data:", response.data)
      console.log("Response status:", response.statusCode)
      console.log("Response message:", response.message)
      
      // Add checklist to local state immediately for better UX
      if (response.data && response.data.id) {
        const newChecklist = {
          id: response.data.id,
          name: name,
          color: color,
          itemCount: 0,
          completedCount: 0
        }
        
        setChecklists((prev) => [newChecklist, ...prev])
        console.log("Added new checklist to local state:", newChecklist)
      } else {
        // Fallback: reload from API if response doesn't have expected structure
        console.log("Fallback: reloading from API")
        await loadChecklists()
      }
    } catch (err) {
      console.error("Failed to create checklist:", err)
      setError("Failed to create checklist")
      throw err
    }
  }

  const handleDeleteChecklist = async (id: string) => {
    try {
      await apiClient.deleteChecklist(id)
      setChecklists(checklists.filter((checklist) => checklist.id !== id))
    } catch (err) {
      setError("Failed to delete checklist")
      throw err
    }
  }

  const handleColorChange = async (id: string, newColor: string) => {
    try {
      console.log(`Updating checklist ${id} color to: ${newColor}`)
      
      // First, try to understand what the API actually supports
      // Let's try a simple approach: just update the local state first
      // and then try to sync with the server
      
      // Update local state immediately for better UX
      setChecklists(
        checklists.map((checklist) => (checklist.id === id ? { ...checklist, color: newColor } : checklist)),
      )
      
      // Now try to sync with server
      try {
        const response = await apiClient.updateChecklistColor(id, newColor)
        console.log("Update checklist color response:", response)
        console.log("Response data:", response.data)
        console.log("Response status:", response.statusCode)
        
        // If successful, clear any errors
        setError("")
        console.log(`Successfully synced checklist ${id} color to ${newColor} with server`)
        
      } catch (serverErr) {
        console.warn(`Server sync failed for checklist ${id} color, but local state updated:`, serverErr)
        
        // Don't show error to user since local state is updated
        // Just log the warning
        console.warn("Color changed locally but failed to sync with server")
        
        // Optionally, you could show a subtle warning
        // setError("Color changed but may not be saved to server")
      }
      
    } catch (err) {
      console.error(`Failed to update checklist ${id} color:`, err)
      setError("Failed to change checklist color. Please try again.")
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900">Todo Lists</h1>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Debug Panel - Hapus setelah masalah teratasi */}
          {process.env.NODE_ENV === 'development' && checklists.length > 0 && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Info:</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Total Checklists: {checklists.length}</div>
                {checklists.map((checklist, index) => (
                  <div key={checklist.id} className="ml-2">
                    <div>Checklist {index + 1}: ID={checklist.id}, Name="{checklist.name}", Color={checklist.color}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8">
            <CreateChecklistDialog onCreateChecklist={handleCreateChecklist} />
          </div>

          {isLoadingChecklists ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">Loading your checklists...</div>
            </div>
          ) : checklists.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">No checklists yet</h2>
              <p className="text-gray-600 mb-8">Create your first checklist to get started</p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Checklists</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {checklists.map((checklist) => (
                  <ChecklistCard
                    key={checklist.id}
                    id={checklist.id}
                    name={checklist.name}
                    color={checklist.color}
                    itemCount={checklist.itemCount}
                    completedCount={checklist.completedCount}
                    onDelete={handleDeleteChecklist}
                    onColorChange={handleColorChange}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
