"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Save } from "lucide-react"
import { apiClient } from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProtectedRoute } from "@/components/protected-route"

interface ItemDetails {
  id: string
  name: string
  completed: boolean
  description?: string
  createdAt?: string
  updatedAt?: string
}

export default function ItemDetailPage({ params }: { params: { id: string; itemId: string } }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [item, setItem] = useState<ItemDetails | null>(null)
  const [isLoadingItem, setIsLoadingItem] = useState(true)
  const [error, setError] = useState("")
  const [editName, setEditName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && params.id && params.itemId) {
      loadItemDetails()
    }
  }, [isAuthenticated, params.id, params.itemId])

  const loadItemDetails = async () => {
    try {
      setIsLoadingItem(true)
      const response = await apiClient.getItemById(params.id, params.itemId)
      
      // Try to extract name from various possible fields
      let itemName = ""
      const possibleNameFields = ['name', 'title', 'description', 'itemName', 'text', 'content', 'label']
      
      for (const field of possibleNameFields) {
        if (response.data[field] && typeof response.data[field] === 'string' && response.data[field].trim()) {
          itemName = response.data[field].trim()
          break
        }
      }
      
      const itemData = {
        id: response.data.id || params.itemId,
        name: itemName,
        completed: response.data.completed || response.data.status === "completed" || false,
        description: response.data.description || "",
        createdAt: response.data.createdAt || response.data.created_at,
        updatedAt: response.data.updatedAt || response.data.updated_at,
      }
      setItem(itemData)
      setEditName(itemName)
      setError("")
    } catch (err) {
      setError("Failed to load item details")
      console.error("Error loading item:", err)
    } finally {
      setIsLoadingItem(false)
    }
  }

  const handleSave = async () => {
    if (!item || !editName.trim()) return

    setIsSaving(true)
    try {
      await apiClient.renameItem(params.id, params.itemId, editName.trim())
      setItem({ ...item, name: editName.trim() })
      setError("")
    } catch (err) {
      setError("Failed to save changes")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleComplete = async () => {
    if (!item) return

    setIsSaving(true)
    try {
      const newCompleted = !item.completed
      await apiClient.updateItemStatus(params.id, params.itemId, { completed: newCompleted })
      setItem({ ...item, completed: newCompleted })
      setError("")
    } catch (err) {
      setError("Failed to update item status")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Button variant="ghost" onClick={() => router.push(`/checklist/${params.id}`)} className="mr-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Checklist
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Item Details</h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {item && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Edit Item</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={handleToggleComplete}
                      disabled={isSaving}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">{item.completed ? "Completed" : "Not completed"}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="itemName"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter item name"
                      disabled={isSaving}
                    />
                    <Button onClick={handleSave} disabled={isSaving || !editName.trim() || editName === item.name}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>

                {(item.createdAt || item.updatedAt) && (
                  <div className="pt-4 border-t space-y-2 text-sm text-gray-600">
                    {item.createdAt && <p>Created: {new Date(item.createdAt).toLocaleString()}</p>}
                    {item.updatedAt && <p>Last updated: {new Date(item.updatedAt).toLocaleString()}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </ProtectedRoute>
  )
}
