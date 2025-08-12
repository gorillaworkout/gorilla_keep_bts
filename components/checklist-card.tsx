"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MoreVertical, Trash2, Palette } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { colorClasses, ColorPicker } from "@/components/color-picker"

interface ChecklistCardProps {
  id: string
  name: string
  color: string
  itemCount?: number
  completedCount?: number
  onDelete: (id: string) => void
  onColorChange?: (id: string, color: string) => void
}

export function ChecklistCard({
  id,
  name,
  color,
  itemCount = 0,
  completedCount = 0,
  onDelete,
  onColorChange,
}: ChecklistCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChangingColor, setIsChangingColor] = useState(false)

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
    if (!onColorChange) return

    setIsChangingColor(true)
    try {
      await onColorChange(id, newColor)
    } catch (error) {
      console.error("Failed to change color:", error)
    } finally {
      setIsChangingColor(false)
    }
  }

  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.gray

  return (
    <Card className={`${colorClass} hover:shadow-md transition-all cursor-pointer group`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Link href={`/checklist/${id}`} className="flex-1">
            <CardTitle className="text-lg font-medium text-gray-800 group-hover:text-gray-900">{name}</CardTitle>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isDeleting || isChangingColor}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onColorChange && (
                <DropdownMenuItem asChild>
                  <div className="flex items-center w-full">
                    <Palette className="h-4 w-4 mr-2" />
                    <span className="mr-2">Change Color</span>
                    <ColorPicker selectedColor={color} onColorChange={handleColorChange} size="sm" />
                  </div>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <Link href={`/checklist/${id}`}>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{itemCount} items</span>
            {itemCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{itemCount} done
              </Badge>
            )}
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}
