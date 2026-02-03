import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import "./globals.css"

import Providers from "@/app/providers"

const geist = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Professional Admin Dashboard",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.className} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  )
}
