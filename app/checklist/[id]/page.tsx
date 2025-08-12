"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { apiClient } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChecklistItem } from "@/components/checklist-item"
import { CreateItemDialog } from "@/components/create-item-dialog"
import { ProtectedRoute } from "@/components/protected-route"
import { colorClasses, ColorPicker } from "@/components/color-picker"

interface ChecklistItemType {
  id: string
  name: string
  completed: boolean
}

interface ChecklistDetails {
  id: string
  name: string
  color: string
  items: ChecklistItemType[]
}

// Helper function to extract item name from various possible field names
function extractItemName(item: any): string {
  const possibleNameFields = ['name', 'title', 'description', 'itemName', 'text', 'content', 'label', 'value']
  
  for (const field of possibleNameFields) {
    if (item[field] && typeof item[field] === 'string' && item[field].trim()) {
      return item[field].trim()
    }
  }
  
  // If no name field found, try to find any string field that might contain the name
  for (const [key, value] of Object.entries(item)) {
    if (typeof value === 'string' && value.trim() && key !== 'id' && key !== 'completed' && key !== 'status') {
      console.log(`Using field '${key}' as fallback name: "${value}"`)
      return value.trim()
    }
  }
  
  // Return empty string instead of hardcoded "Untitled Item"
  // This will be handled in the UI to show appropriate placeholder
  return ""
}

// Helper function to extract item ID
function extractItemId(item: any): string {
  // Use existing ID or generate a stable ID based on item data
  if (item.id) return item.id
  if (item.itemId) return item.itemId
  if (item.checklistItemId) return item.checklistItemId
  
  // Generate stable ID based on item content to avoid hydration issues
  if (item.name || item.title || item.description) {
    const content = (item.name || item.title || item.description || '').toString()
    return `item_${content.length}_${content.charCodeAt(0)}`
  }
  
  // Fallback to a stable ID based on item position/index
  // This will be handled by the parent component to avoid hydration issues
  return `item_fallback`
}

// Helper function to extract completion status
function extractCompletionStatus(item: any): boolean {
  return item.completed || item.status === "completed" || item.isDone || item.done || false
}

interface PageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default function ChecklistDetailPage({ params }: PageProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [checklist, setChecklist] = useState<ChecklistDetails | null>(null)
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(true)
  const [error, setError] = useState("")
  const [checklistId, setChecklistId] = useState<string>("")

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params)
      setChecklistId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && checklistId) {
      loadChecklistDetails()
    }
  }, [isAuthenticated, checklistId])

  const loadChecklistDetails = async () => {
    try {
      setIsLoadingChecklist(true)

      const [checklistResponse, itemsResponse] = await Promise.all([
        apiClient.getChecklist(checklistId).catch(() => ({ data: null })),
        apiClient.getChecklistItems(checklistId),
      ])

      const checklistData = checklistResponse.data
      const itemsData = itemsResponse.data || []

      // Debug logging
      console.log("Checklist response:", checklistResponse)
      console.log("Items response:", itemsResponse)
      console.log("Raw items data:", itemsData)
      console.log("Items response status:", itemsResponse.statusCode)
      console.log("Items response message:", itemsResponse.message)
      console.log("Items data type:", typeof itemsData)
      console.log("Items data length:", itemsData.length)

      setChecklist({
        id: checklistId,
        name: checklistData?.name || checklistData?.title || "My Checklist",
        color: checklistData?.color || "yellow",
        items: itemsData.map((item: any, index: number) => {
          // Debug logging for each item
          console.log("Processing item:", item)
          console.log("Item keys:", Object.keys(item))
          console.log("Item values:", Object.values(item))
          
          const itemName = extractItemName(item)
          let itemId = extractItemId(item)
          const isCompleted = extractCompletionStatus(item)
          
          // Handle fallback ID by using index as fallback
          if (itemId === 'item_fallback') {
            itemId = `item_index_${index}`
          }
          
          console.log(`Final item ${itemId}: name="${itemName}", completed=${isCompleted}`)
          
          return {
            id: itemId,
            name: itemName,
            completed: isCompleted,
          }
        }),
      })
      setError("")
    } catch (err) {
      setError("Failed to load checklist details")
      console.error("Error loading checklist:", err)
    } finally {
      setIsLoadingChecklist(false)
    }
  }

  const handleCreateItem = async (name: string) => {
    try {
      console.log("Creating item with name:", name)
      const itemData = { name, completed: false }
      console.log("Sending item data to API:", itemData)
      
      const response = await apiClient.saveChecklistItem(checklistId, itemData)
      console.log("API response for creating item:", response)
      console.log("Response data:", response.data)
      console.log("Response status:", response.statusCode)
      console.log("Response message:", response.message)
      
      // Add item to local state immediately for better UX
      if (response.data && response.data.id) {
        const newItem = {
          id: response.data.id,
          name: name, // Use the name that was sent, not from API response
          completed: false
        }
        
        setChecklist((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            items: [...prev.items, newItem]
          }
        })
        
        console.log("Added new item to local state:", newItem)
      } else {
        // Fallback: reload from API if response doesn't have expected structure
        console.log("Fallback: reloading from API")
        await loadChecklistDetails()
      }
    } catch (err) {
      console.error("Failed to create item:", err)
      setError("Failed to create item")
      throw err
    }
  }

  const handleToggleComplete = async (itemId: string, completed: boolean) => {
    try {
      await apiClient.updateItemStatus(checklistId, itemId, { completed })
      // Update local state immediately for better UX
      setChecklist((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((item) => (item.id === itemId ? { ...item, completed } : item)),
        }
      })
    } catch (err) {
      setError("Failed to update item status")
      // Reload to revert changes on error
      await loadChecklistDetails()
      throw err
    }
  }

  const handleRenameItem = async (itemId: string, newName: string) => {
    try {
      await apiClient.renameItem(checklistId, itemId, newName)
      // Update local state immediately for better UX
      setChecklist((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((item) => (item.id === itemId ? { ...item, name: newName } : item)),
        }
      })
    } catch (err) {
      setError("Failed to rename item")
      // Reload to revert changes on error
      await loadChecklistDetails()
      throw err
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      await apiClient.deleteItem(checklistId, itemId)
      // Update local state immediately for better UX
      setChecklist((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId),
        }
      })
    } catch (err) {
      setError("Failed to delete item")
      // Reload to revert changes on error
      await loadChecklistDetails()
      throw err
    }
  }

  const handleColorChange = async (newColor: string) => {
    if (!checklist) return

    try {
      // Update checklist color via API
      await apiClient.updateChecklist(checklistId, { color: newColor })

      // Update local state immediately
      setChecklist({ ...checklist, color: newColor })
      setError("")
    } catch (err) {
      // Fallback to save method
      try {
        await apiClient.saveChecklist({ id: checklistId, color: newColor })
        setChecklist({ ...checklist, color: newColor })
        setError("")
      } catch (fallbackErr) {
        setError("Failed to change checklist color")
      }
    }
  }

  if (!checklistId) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <h1 className="text-xl font-semibold text-gray-900">{checklist?.name || "Checklist Details"}</h1>
              </div>
              {checklist && <ColorPicker selectedColor={checklist.color} onColorChange={handleColorChange} />}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoadingChecklist ? (
            <div className="text-center py-12">
              <div className="text-lg text-gray-600">Loading checklist...</div>
            </div>
          ) : checklist ? (
            <div
              className={`rounded-lg shadow-sm border p-6 ${colorClasses[checklist.color as keyof typeof colorClasses] || colorClasses.gray}`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{checklist.name}</h2>
                <CreateItemDialog onCreateItem={handleCreateItem} />
              </div>

              {checklist.items.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">No items in this checklist yet</p>
                  <CreateItemDialog onCreateItem={handleCreateItem} />
                </div>
              ) : (
                <div className="space-y-3">
                  {checklist.items.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      id={item.id}
                      name={item.name}
                      completed={item.completed}
                      onToggleComplete={handleToggleComplete}
                      onRename={handleRenameItem}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </div>
              )}

              {checklist.items.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-300">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      {checklist.items.filter((item) => item.completed).length} of {checklist.items.length} completed
                    </span>
                    <span>
                      {Math.round(
                        (checklist.items.filter((item) => item.completed).length / checklist.items.length) * 100,
                      )}
                      % done
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Checklist not found</p>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
