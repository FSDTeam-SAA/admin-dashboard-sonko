"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { authForgetPassword } from "@/lib/api"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")

  const mutation = useMutation({
    mutationFn: authForgetPassword,
    onSuccess: () => {
      toast.success("OTP sent to your email")
      router.push(`/auth/otp?email=${encodeURIComponent(email)}&mode=reset`)
    },
    onError: () => {
      toast.error("Unable to send OTP")
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!email) {
      toast.error("Email is required")
      return
    }
    mutation.mutate({ email })
  }

  return (
    <div className="w-full max-w-md">
      <Card className="border-border/60 shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">Forgot Password</CardTitle>
          <CardDescription>Enter your email to receive a reset OTP.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Sending..." : "Send OTP"}
            </Button>
            <div className="text-center text-sm text-gray-500">
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
