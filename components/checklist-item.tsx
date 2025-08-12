"use client"

import type React from "react"
import { useEffect } from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoreVertical, Edit2, Trash2, Check, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ChecklistItemProps {
  id: string
  name: string
  completed: boolean
  onToggleComplete: (id: string, completed: boolean) => Promise<void>
  onRename: (id: string, newName: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function ChecklistItem({ id, name, completed, onToggleComplete, onRename, onDelete }: ChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(name)
  const [isLoading, setIsLoading] = useState(false)

  // Update editName when name prop changes
  useEffect(() => {
    setEditName(name)
  }, [name])

  const handleToggleComplete = async () => {
    setIsLoading(true)
    try {
      await onToggleComplete(id, !completed)
    } catch (error) {
      console.error("Failed to toggle item:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      // Don't save empty names
      setEditName(name)
      setIsEditing(false)
      return
    }
    
    if (editName === name) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    try {
      await onRename(id, editName.trim())
      setIsEditing(false)
    } catch (error) {
      console.error("Failed to rename item:", error)
      setEditName(name)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditName(name)
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await onDelete(id)
    } catch (error) {
      console.error("Failed to delete item:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit()
    } else if (e.key === "Escape") {
      handleCancelEdit()
    }
  }

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
      <input
        type="checkbox"
        checked={completed}
        onChange={handleToggleComplete}
        disabled={isLoading}
        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
      />

      <div className="flex-1">
        {isEditing ? (
          <div className="flex items-center space-x-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1"
              autoFocus
              disabled={isLoading}
            />
            <Button size="sm" onClick={handleSaveEdit} disabled={isLoading}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isLoading}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span
            className={`${completed ? "line-through text-gray-500" : "text-gray-900"} cursor-pointer select-none`}
            onClick={() => setIsEditing(true)}
          >
            {name || "Click to add name..."}
          </span>
        )}
      </div>

      {!isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={isLoading}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
