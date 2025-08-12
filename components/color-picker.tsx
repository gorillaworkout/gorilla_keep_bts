"use client"

import { Button } from "@/components/ui/button"
import { Palette } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export const colors = [
  { name: "Yellow", value: "yellow", class: "bg-yellow-200", hoverClass: "hover:bg-yellow-300" },
  { name: "Blue", value: "blue", class: "bg-blue-200", hoverClass: "hover:bg-blue-300" },
  { name: "Green", value: "green", class: "bg-green-200", hoverClass: "hover:bg-green-300" },
  { name: "Pink", value: "pink", class: "bg-pink-200", hoverClass: "hover:bg-pink-300" },
  { name: "Purple", value: "purple", class: "bg-purple-200", hoverClass: "hover:bg-purple-300" },
  { name: "Orange", value: "orange", class: "bg-orange-200", hoverClass: "hover:bg-orange-300" },
  { name: "Red", value: "red", class: "bg-red-200", hoverClass: "hover:bg-red-300" },
  { name: "Gray", value: "gray", class: "bg-gray-200", hoverClass: "hover:bg-gray-300" },
  { name: "Teal", value: "teal", class: "bg-teal-200", hoverClass: "hover:bg-teal-300" },
  { name: "Indigo", value: "indigo", class: "bg-indigo-200", hoverClass: "hover:bg-indigo-300" },
  { name: "Lime", value: "lime", class: "bg-lime-200", hoverClass: "hover:bg-lime-300" },
  { name: "Cyan", value: "cyan", class: "bg-cyan-200", hoverClass: "hover:bg-cyan-300" },
]

export const colorClasses = {
  yellow: "bg-yellow-100 border-yellow-200 hover:bg-yellow-200",
  blue: "bg-blue-100 border-blue-200 hover:bg-blue-200",
  green: "bg-green-100 border-green-200 hover:bg-green-200",
  pink: "bg-pink-100 border-pink-200 hover:bg-pink-200",
  purple: "bg-purple-100 border-purple-200 hover:bg-purple-200",
  orange: "bg-orange-100 border-orange-200 hover:bg-orange-200",
  red: "bg-red-100 border-red-200 hover:bg-red-200",
  gray: "bg-gray-100 border-gray-200 hover:bg-gray-200",
  teal: "bg-teal-100 border-teal-200 hover:bg-teal-200",
  indigo: "bg-indigo-100 border-indigo-200 hover:bg-indigo-200",
  lime: "bg-lime-100 border-lime-200 hover:bg-lime-200",
  cyan: "bg-cyan-100 border-cyan-200 hover:bg-cyan-200",
}

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
  size?: "sm" | "md" | "lg"
}

export function ColorPicker({ selectedColor, onColorChange, size = "md" }: ColorPickerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="p-2 bg-transparent">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="p-2">
          <p className="text-sm font-medium mb-2">Choose a color</p>
          <div className="grid grid-cols-6 gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => onColorChange(color.value)}
                className={`
                  ${sizeClasses[size]} rounded-lg border-2 transition-all
                  ${color.class} ${color.hoverClass}
                  ${
                    selectedColor === color.value
                      ? "border-gray-800 scale-110 shadow-md"
                      : "border-gray-300 hover:border-gray-400"
                  }
                `}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ColorGridProps {
  selectedColor: string
  onColorChange: (color: string) => void
  size?: "sm" | "md" | "lg"
}

export function ColorGrid({ selectedColor, onColorChange, size = "md" }: ColorGridProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }

  return (
    <div className="grid grid-cols-6 gap-2">
      {colors.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onColorChange(color.value)}
          className={`
            ${sizeClasses[size]} rounded-lg border-2 transition-all
            ${color.class} ${color.hoverClass}
            ${
              selectedColor === color.value
                ? "border-gray-800 scale-110 shadow-md"
                : "border-gray-300 hover:border-gray-400"
            }
          `}
          title={color.name}
        />
      ))}
    </div>
  )
}
