"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { ColorGrid } from "@/components/color-picker"

interface CreateChecklistDialogProps {
  onCreateChecklist: (name: string, color: string) => Promise<void>
}

export function CreateChecklistDialog({ onCreateChecklist }: CreateChecklistDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [selectedColor, setSelectedColor] = useState("yellow")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      await onCreateChecklist(name.trim(), selectedColor)
      setName("")
      setSelectedColor("yellow")
      setOpen(false)
    } catch (error) {
      console.error("Failed to create checklist:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mb-6">
          <Plus className="h-4 w-4 mr-2" />
          New Checklist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 border-0 shadow-xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold">Create New Checklist</DialogTitle>
          <DialogDescription className="text-gray-600">Give your checklist a name and choose a color.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="px-6 pb-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter checklist name"
                className="h-12 text-lg border-2 focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Color</Label>
              <ColorGrid selectedColor={selectedColor} onColorChange={setSelectedColor} size="lg" />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()} className="h-10 px-6">
              {isLoading ? "Creating..." : "Create Checklist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
