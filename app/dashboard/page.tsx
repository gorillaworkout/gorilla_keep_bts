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
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

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

      // Periksa jika response.data null atau undefined
      const checklistsWithCounts = await Promise.all(
        (response.data ?? []).map(async (item: any, index: number) => {
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
            
            // Try to restore color from localStorage if API doesn't have it
            if (typeof window !== "undefined" && (!item.color || item.color === "yellow")) {
              const colorBackup = JSON.parse(localStorage.getItem("checklistColors") || "{}")
              if (colorBackup[checklist.id]) {
                checklist.color = colorBackup[checklist.id]
                console.log(`Restored color for checklist ${checklist.id} from localStorage:`, checklist.color)
              }
            }
            
            // Try to restore completed count from localStorage if API count seems wrong
            if (typeof window !== "undefined") {
              const completedStatusBackup = JSON.parse(localStorage.getItem(`checklist_${checklist.id}_completedStatus`) || "{}")
              const localStorageCompletedCount = Object.values(completedStatusBackup).filter(status => status === true).length
              
              if (localStorageCompletedCount > 0 && localStorageCompletedCount !== checklist.completedCount) {
                console.log(`Counter mismatch for checklist ${checklist.id}: API=${checklist.completedCount}, localStorage=${localStorageCompletedCount}`)
                checklist.completedCount = localStorageCompletedCount
                console.log(`Restored completed count for checklist ${checklist.id} from localStorage: ${localStorageCompletedCount}`)
              }
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
      
      // Restore order from localStorage if available
      if (typeof window !== "undefined") {
        const savedOrder = localStorage.getItem('checklistOrder')
        if (savedOrder) {
          try {
            const orderData = JSON.parse(savedOrder)
            const orderedChecklists = [...checklistsWithCounts]
            
            // Sort based on saved order
            orderedChecklists.sort((a, b) => {
              const aOrder = orderData.find((o: any) => o.id === a.id)?.order ?? 999
              const bOrder = orderData.find((o: any) => o.id === b.id)?.order ?? 999
              return aOrder - bOrder
            })
            
            setChecklists(orderedChecklists)
            console.log("Restored checklist order from localStorage")
            return
          } catch (err) {
            console.warn("Failed to restore checklist order:", err)
          }
        }
      }
      
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
      console.log(`Attempting to delete checklist ${id}`)
      
      // First, check if checklist has items that might prevent deletion
      const checklistToDelete = checklists.find(c => c.id === id)
      if (checklistToDelete && (checklistToDelete.itemCount || 0) > 0) {
        console.log(`Checklist ${id} has ${checklistToDelete.itemCount || 0} items, attempting to delete items first`)
        
        try {
          // Try to delete all items first
          const itemsResponse = await apiClient.getChecklistItems(id)
          const items = itemsResponse.data || []
          
          for (const item of items) {
            try {
              await apiClient.deleteItem(id, item.id || item.itemId)
              console.log(`Deleted item ${item.id || item.itemId} from checklist ${id}`)
            } catch (itemDeleteErr) {
              console.warn(`Failed to delete item ${item.id || item.itemId}:`, itemDeleteErr)
            }
          }
        } catch (itemsErr) {
          console.warn(`Failed to get items for checklist ${id}:`, itemsErr)
        }
      }
      
      // Now try to delete the checklist
      const response = await apiClient.deleteChecklist(id)
      console.log("Delete checklist response:", response)
      
      // Remove from local state
      setChecklists(checklists.filter((checklist) => checklist.id !== id))
      
      // Clean up localStorage backups
      if (typeof window !== "undefined") {
        // Remove color backup
        const colorBackup = JSON.parse(localStorage.getItem("checklistColors") || "{}")
        delete colorBackup[id]
        localStorage.setItem("checklistColors", JSON.stringify(colorBackup))
        
        // Remove item names backup
        const itemNamesBackup = JSON.parse(localStorage.getItem(`checklist_${id}_itemNames`) || "{}")
        localStorage.removeItem(`checklist_${id}_itemNames`)
        
        // Remove completed status backup
        const completedStatusBackup = JSON.parse(localStorage.getItem(`checklist_${id}_completedStatus`) || "{}")
        localStorage.removeItem(`checklist_${id}_completedStatus`)
        
        console.log(`Cleaned up localStorage backups for checklist ${id}`)
      }
      
      console.log(`Successfully deleted checklist ${id}`)
      
    } catch (err) {
      console.error(`Failed to delete checklist ${id}:`, err)
      
      // Provide more specific error messages based on error type
      if (err instanceof Error) {
        if (err.message.includes('500')) {
          console.warn(`Server error 500 for checklist ${id}, attempting fallback deletion`)
          
          // Try fallback approach: remove from local state and localStorage
          // This allows user to continue using the app even if server is down
          try {
            setChecklists(checklists.filter((checklist) => checklist.id !== id))
            
            // Clean up localStorage backups
            if (typeof window !== "undefined") {
              const colorBackup = JSON.parse(localStorage.getItem("checklistColors") || "{}")
              delete colorBackup[id]
              localStorage.setItem("checklistColors", JSON.stringify(colorBackup))
              
              localStorage.removeItem(`checklist_${id}_itemNames`)
              localStorage.removeItem(`checklist_${id}_completedStatus`)
              
              console.log(`Fallback: removed checklist ${id} from local state and localStorage`)
            }
            
            setError("Checklist removed locally due to server error. It may still exist on the server. Please try again later.")
            return
            
          } catch (fallbackErr) {
            console.error(`Fallback deletion also failed for checklist ${id}:`, fallbackErr)
          }
          
          setError("Server error occurred. The checklist may have items that need to be deleted first. Please try again.")
        } else if (err.message.includes('404')) {
          setError("Checklist not found. It may have already been deleted.")
        } else if (err.message.includes('403')) {
          setError("Permission denied. You may not have access to delete this checklist.")
        } else {
          setError(`Failed to delete checklist: ${err.message}`)
        }
      } else {
        setError("Failed to delete checklist. Please try again.")
      }
      
      // Don't throw error to prevent UI from breaking
      // Just show error message to user
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
      
      // Save color to localStorage as backup
      if (typeof window !== "undefined") {
        const colorBackup = JSON.parse(localStorage.getItem("checklistColors") || "{}")
        colorBackup[id] = newColor
        localStorage.setItem("checklistColors", JSON.stringify(colorBackup))
        console.log(`Saved color backup for checklist ${id}:`, newColor)
      }
      
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

  // Function to create item from checklist card
  const handleCreateItemFromCard = async (checklistId: string, itemName: string) => {
    try {
      console.log(`Creating item "${itemName}" in checklist ${checklistId} from card`)
      
      // Create item using existing API
      const response = await apiClient.saveChecklistItem(checklistId, { name: itemName, completed: false })
      console.log("Item created from card:", response)
      
      // Update local state to reflect new item
      setChecklists(prev => 
        prev.map(checklist => 
          checklist.id === checklistId 
            ? { 
                ...checklist, 
                itemCount: (checklist.itemCount || 0) + 1,
                completedCount: checklist.completedCount || 0
              }
            : checklist
        )
      )
      
      // Save item name to localStorage as backup
      if (typeof window !== "undefined") {
        const itemNamesBackup = JSON.parse(localStorage.getItem(`checklist_${checklistId}_itemNames`) || "{}")
        if (response.data && response.data.id) {
          itemNamesBackup[response.data.id] = itemName
          localStorage.setItem(`checklist_${checklistId}_itemNames`, JSON.stringify(itemNamesBackup))
          
          // Also save completed status
          const completedStatusBackup = JSON.parse(localStorage.getItem(`checklist_${checklistId}_completedStatus`) || "{}")
          completedStatusBackup[response.data.id] = false
          localStorage.setItem(`checklist_${checklistId}_completedStatus`, JSON.stringify(completedStatusBackup))
        }
      }
      
      console.log(`Successfully added item "${itemName}" to checklist ${checklistId}`)
      
    } catch (err) {
      console.error(`Failed to create item in checklist ${checklistId}:`, err)
      throw err
    }
  }

  // Function to update checklist counter from localStorage
  const updateChecklistCounter = (checklistId: string) => {
    if (typeof window !== "undefined") {
      const completedStatusBackup = JSON.parse(localStorage.getItem(`checklist_${checklistId}_completedStatus`) || "{}")
      const localStorageCompletedCount = Object.values(completedStatusBackup).filter(status => status === true).length
      
      setChecklists(prev => 
        prev.map(checklist => 
          checklist.id === checklistId 
            ? { ...checklist, completedCount: localStorageCompletedCount }
            : checklist
        )
      )
      
      console.log(`Updated counter for checklist ${checklistId}: ${localStorageCompletedCount} completed`)
    }
  }

  // Drag and Drop functions
  const handleDragStart = (e: React.DragEvent, checklistId: string) => {
    setDraggedItem(checklistId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', checklistId)
  }

  const handleDragOver = (e: React.DragEvent, checklistId: string) => {
    e.preventDefault()
    if (draggedItem && draggedItem !== checklistId) {
      setDragOverItem(checklistId)
    }
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetChecklistId: string) => {
    e.preventDefault()
    
    if (draggedItem && draggedItem !== targetChecklistId) {
      const draggedIndex = checklists.findIndex(c => c.id === draggedItem)
      const targetIndex = checklists.findIndex(c => c.id === targetChecklistId)
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newChecklists = [...checklists]
        const [draggedChecklist] = newChecklists.splice(draggedIndex, 1)
        newChecklists.splice(targetIndex, 0, draggedChecklist)
        
        setChecklists(newChecklists)
        
        // Save new order to localStorage
        if (typeof window !== "undefined") {
          const orderData = newChecklists.map((c, index) => ({ id: c.id, order: index }))
          localStorage.setItem('checklistOrder', JSON.stringify(orderData))
        }
        
        console.log(`Moved checklist ${draggedItem} to position ${targetIndex}`)
      }
    }
    
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  // Listen for storage changes to update counters in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('checklist_') && e.key.endsWith('_completedStatus')) {
        const checklistId = e.key.replace('checklist_', '').replace('_completedStatus', '')
        console.log(`Storage change detected for checklist ${checklistId}`)
        updateChecklistCounter(checklistId)
      }
    }

    const handleFocus = () => {
      console.log("Dashboard focused, updating all counters from localStorage")
      // Update all checklist counters when dashboard is focused
      checklists.forEach(checklist => {
        updateChecklistCounter(checklist.id)
      })
    }

    if (typeof window !== "undefined") {
      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('focus', handleFocus)
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('focus', handleFocus)
      }
    }
  }, [checklists])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">🦍 Gorilla Keep</h1>
                <span className="text-sm text-gray-500 hidden sm:block">Your personal checklist app</span>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={handleLogout} className="h-9">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}


          {isLoadingChecklists ? (
            <div className="text-center py-16">
              <div className="text-lg text-gray-600">Loading your checklists...</div>
            </div>
          ) : checklists.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">🦍</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Gorilla Keep!</h2>
                <p className="text-gray-600 mb-8">Create your first checklist to get started. Organize your tasks, track your progress, and stay productive.</p>
                <CreateChecklistDialog onCreateChecklist={handleCreateChecklist} />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Your Checklists</h2>
                  <p className="text-gray-600 mt-1">Manage and organize your tasks</p>
                </div>
                <CreateChecklistDialog onCreateChecklist={handleCreateChecklist} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    onCreateItem={handleCreateItemFromCard}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    isDragged={draggedItem === checklist.id}
                    isDragOver={dragOverItem === checklist.id}
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
