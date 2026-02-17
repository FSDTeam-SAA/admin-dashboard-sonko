"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function CustomPagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = [1, 2].filter((page) => page <= totalPages)

  return (
    <div className="flex items-center justify-end gap-2 mt-6">
      <button
        type="button"
        className="h-9 w-9 rounded-md border border-[#9f9f9f] text-[#2c2c2c] flex items-center justify-center"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          className={`h-9 w-9 rounded-md border text-sm font-medium ${
            currentPage === page ? "border-[#2c2c2c] text-[#2c2c2c]" : "border-[#9f9f9f] text-[#2c2c2c]"
          }`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        className="h-9 w-9 rounded-md bg-[#4da3ff] text-white flex items-center justify-center"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
