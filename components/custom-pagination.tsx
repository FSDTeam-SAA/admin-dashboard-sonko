"use client"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function CustomPagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-end gap-2 mt-6">
      <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
        let pageNum
        if (totalPages <= 3) {
          pageNum = i + 1
        } else if (currentPage <= 2) {
          pageNum = i + 1
        } else if (currentPage >= totalPages - 1) {
          pageNum = totalPages - 2 + i
        } else {
          pageNum = currentPage - 1 + i
        }

        return (
          <Button
            key={pageNum}
            variant={currentPage === pageNum ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(pageNum)}
            className={currentPage === pageNum ? "bg-blue-500 text-white" : ""}
          >
            {pageNum}
          </Button>
        )
      })}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
