"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MoreVertical, Trash2, Palette, Plus, Check, Edit2 } from "lucide-react"
import { ColorPicker } from "@/components/color-picker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { colorClasses } from "@/components/color-picker"
import { apiClient } from "@/lib/api"

interface ChecklistCardProps {
  id: string
  name: string
  color: string
  itemCount?: number
  completedCount?: number
  onDelete: (id: string) => Promise<void>
  onColorChange: (id: string, color: string) => Promise<void>
  onCreateItem: (checklistId: string, itemName: string) => Promise<void>
  onDragStart: (e: React.DragEvent, checklistId: string) => void
  onDragOver: (e: React.DragEvent, checklistId: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, targetChecklistId: string) => void
  onDragEnd: () => void
  isDragged: boolean
  isDragOver: boolean
}

export function ChecklistCard({
  id,
  name,
  color,
  itemCount = 0,
  completedCount = 0,
  onDelete,
  onColorChange,
  onCreateItem,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  isDragged,
  isDragOver,
}: ChecklistCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChangingColor, setIsChangingColor] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(name)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemName, setNewItemName] = useState("")
  const [items, setItems] = useState<any[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)

  // Fetch items when component mounts
  useEffect(() => {
    const fetchItems = async () => {
      if (itemCount > 0) {
        setIsLoadingItems(true)
        try {
          const response = await apiClient.getChecklistItems(id)
          const itemsData = response.data || []
          
          console.log(`Fetched items for checklist ${id}:`, itemsData)
          
          // Map items to include name and completed status with better field detection
          const mappedItems = itemsData.map((item: any) => {
            console.log(`Processing item:`, item)
            console.log(`Item keys:`, Object.keys(item))
            console.log(`Item values:`, Object.values(item))
            
            // Try multiple possible field names for the item name
            let itemName = ""
            const possibleNameFields = ['name', 'title', 'description', 'itemName', 'text', 'content', 'label', 'value']
            
            for (const field of possibleNameFields) {
              if (item[field] && typeof item[field] === 'string' && item[field].trim()) {
                itemName = item[field].trim()
                console.log(`Found name in field '${field}': "${itemName}"`)
                break
              }
            }
            
            // If no name field found, try to find any string field that might contain the name
            if (!itemName) {
              for (const [key, value] of Object.entries(item)) {
                if (typeof value === 'string' && value.trim() && key !== 'id' && key !== 'completed' && key !== 'status') {
                  itemName = value.trim()
                  console.log(`Using field '${key}' as fallback name: "${itemName}"`)
                  break
                }
              }
            }
            
            const mappedItem = {
              id: item.id || item.itemId || String(Math.random()),
              name: itemName || "Untitled Item",
              completed: item.completed || item.status === "completed" || item.isDone || false
            }
            
            // Try to restore name from localStorage if API doesn't have it
            if (typeof window !== "undefined" && (!itemName || itemName === "Untitled Item")) {
              const itemNamesBackup = JSON.parse(localStorage.getItem(`checklist_${id}_itemNames`) || "{}")
              if (itemNamesBackup[mappedItem.id]) {
                mappedItem.name = itemNamesBackup[mappedItem.id]
                console.log(`Restored name for item ${mappedItem.id} from localStorage: "${mappedItem.name}"`)
              }
            }
            
            // Try to restore completed status from localStorage
            if (typeof window !== "undefined") {
              const completedStatusBackup = JSON.parse(localStorage.getItem(`checklist_${id}_completedStatus`) || "{}")
              if (completedStatusBackup[mappedItem.id] !== undefined) {
                mappedItem.completed = completedStatusBackup[mappedItem.id]
                console.log(`Restored completed status for item ${mappedItem.id}: ${mappedItem.completed}`)
              }
            }
            
            console.log(`Final mapped item:`, mappedItem)
            return mappedItem
          })
          
          setItems(mappedItems)
        } catch (error) {
          console.error("Failed to fetch items:", error)
        } finally {
          setIsLoadingItems(false)
        }
      }
    }

    fetchItems()
  }, [id, itemCount])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(id)
    } catch (error) {
      console.error("Failed to delete checklist:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleColorChange = async (newColor: string) => {
    setIsChangingColor(true)
    try {
      await onColorChange(id, newColor)
    } catch (error) {
      console.error("Failed to change color:", error)
    } finally {
      setIsChangingColor(false)
    }
  }

  const handleSaveEdit = () => {
    // Keep existing name for now - function not changed
    setIsEditing(false)
    setEditName(name)
  }

  const handleAddItem = async () => {
    if (!newItemName.trim()) return
    
    try {
      const response = await onCreateItem(id, newItemName.trim())
      
      // Add new item to local state
      const newItem = {
        id: Date.now().toString(), // Temporary ID
        name: newItemName.trim(),
        completed: false
      }
      setItems(prev => [...prev, newItem])
      
      setNewItemName("")
      setIsAddingItem(false)
    } catch (error) {
      console.error("Failed to add item:", error)
    }
  }

  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.gray

  return (
    <Card 
      className={`${colorClass} hover:shadow-lg transition-all duration-200 border-0 shadow-sm min-h-[280px] flex flex-col ${
        isDragged ? 'opacity-50 scale-95' : ''
      } ${isDragOver ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, id)}
      onDragOver={(e) => onDragOver(e, id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, id)}
      onDragEnd={onDragEnd}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-lg font-medium border-0 p-0 h-auto bg-transparent focus:ring-0"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-6 w-6 p-0">
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-1 h-6 bg-gray-300 rounded-full cursor-move opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardTitle className="text-lg font-medium text-gray-800 group-hover:text-gray-900 truncate">
                  {name}
                </CardTitle>
              </div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-100"
                disabled={isDeleting || isChangingColor}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <div className="flex items-center w-full">
                  <Palette className="h-4 w-4 mr-2" />
                  <span className="mr-2">Change Color</span>
                  <ColorPicker selectedColor={color} onColorChange={handleColorChange} size="sm" />
                </div>
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    disabled={isDeleting}
                    className="text-red-600 focus:text-red-600"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Checklist</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{name}"? 
                      {itemCount > 0 && (
                        <span className="block mt-2 text-orange-600">
                          ⚠️ This checklist has {itemCount} item{itemCount > 1 ? 's' : ''}. 
                          All items will be deleted as well.
                        </span>
                      )}
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1 flex flex-col">
        {/* Quick Add Item */}
        <div className="mb-3 flex-shrink-0">
          {isAddingItem ? (
            <div className="flex items-center space-x-2">
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem()
                  } else if (e.key === 'Escape') {
                    setIsAddingItem(false)
                    setNewItemName("")
                  }
                }}
                placeholder="Add item..."
                className="h-8 text-sm border-0 p-0 bg-transparent focus:ring-0"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleAddItem} className="h-6 w-6 p-0">
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingItem(true)}
              className="h-8 w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 rounded-md"
            >
              <Plus className="h-3 w-3 mr-2" />
              Add item
            </Button>
          )}
        </div>

        {/* Items List - Show actual items */}
        <div className="space-y-2 mb-3 flex-1 overflow-y-auto">
          
          {isLoadingItems ? (
            <div className="text-sm text-gray-500 italic text-center py-4">
              Loading items...
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-2">
              {/* Items counter */}
              <div className="text-sm text-gray-600 mb-2">
                <div className="flex items-center justify-between">
                  <span>{items.length} items</span>
                  <Badge variant="secondary" className="text-xs">
                    {items.filter(item => item.completed).length}/{items.length} done
                  </Badge>
                </div>
              </div>
              
              {/* Actual items from API */}
              {items.slice(0, 5).map((item, index) => (
                <div key={item.id} className="flex items-center space-x-2 text-sm">
                  <div className={`w-3 h-3 rounded-full ${item.completed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className={`text-gray-600 flex-1 truncate ${item.completed ? 'line-through text-gray-400' : ''}`}>
                    {item.name}
                  </span>
                  {item.completed && (
                    <Check className="h-3 w-3 text-green-500" />
                  )}
                </div>
              ))}
              
              {items.length > 5 && (
                <div className="text-xs text-gray-500 italic text-center py-1">
                  +{items.length - 5} more items
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic text-center py-4">
              No items yet
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {items.length > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3 flex-shrink-0">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.round((items.filter(item => item.completed).length / items.length) * 100)}%` }}
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200/50 flex-shrink-0">
          <div className="text-xs text-gray-500">
            {items.length > 0 ? (
              <span>{Math.round((items.filter(item => item.completed).length / items.length) * 100)}% complete</span>
            ) : (
              <span>Empty checklist</span>
            )}
          </div>
          
          <Link href={`/checklist/${id}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              Open
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
