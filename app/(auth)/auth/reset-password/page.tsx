"use client"

import type React from "react"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { authResetPassword } from "@/lib/api"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""
  const otp = searchParams.get("otp") ?? ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const mutation = useMutation({
    mutationFn: authResetPassword,
    onSuccess: () => {
      toast.success("Password reset successfully")
      router.push("/auth/login")
    },
    onError: () => {
      toast.error("Failed to reset password")
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!email || !otp) {
      toast.error("Email and OTP are required")
      return
    }
    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    mutation.mutate({ email, otp, password })
  }

  return (
    <div className="w-full max-w-md">
      <Card className="border-border/60 shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">Reset Password</CardTitle>
          <CardDescription>Set a new password for {email || "your account"}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a strong password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating..." : "Reset Password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md">
          <Card className="border-border/60 shadow-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-semibold">Reset Password</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="h-10 rounded-md bg-gray-100" />
              <div className="h-10 rounded-md bg-gray-100" />
              <div className="h-10 rounded-md bg-gray-100" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
