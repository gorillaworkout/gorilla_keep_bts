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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Checklist</DialogTitle>
          <DialogDescription>Give your checklist a name and choose a color.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter checklist name"
                required
              />
            </div>
            <div className="grid gap-3">
              <Label>Color</Label>
              <ColorGrid selectedColor={selectedColor} onColorChange={setSelectedColor} size="lg" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
