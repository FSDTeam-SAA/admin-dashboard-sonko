"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export type ViewField = {
  label: string
  value: React.ReactNode
}

type ViewModalProps = {
  open: boolean
  title: string
  description?: string
  fields?: ViewField[]
  onClose: () => void
}

export function ViewModal({
  open,
  title,
  description,
  fields = [],
  onClose,
}: ViewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="grid gap-3">
          {fields.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No details available.
            </div>
          ) : (
            fields.map((field) => (
              <div
                key={field.label}
                className="flex items-start justify-between gap-6 border-b border-border pb-2 text-sm last:border-b-0 last:pb-0"
              >
                <div className="text-muted-foreground">{field.label}</div>
                <div className="text-right text-foreground break-words max-w-[60%]">
                  {field.value}
                </div>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
