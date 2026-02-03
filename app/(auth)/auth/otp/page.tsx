"use client"

import type React from "react"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { toast } from "sonner"
import { authVerifyEmail, authVerifyOtp } from "@/lib/api"

function OtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email") ?? ""
  const mode = searchParams.get("mode") ?? "reset"
  const [otp, setOtp] = useState("")

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "verify") {
        return authVerifyEmail({ email, otp })
      }
      return authVerifyOtp({ email, otp })
    },
    onSuccess: () => {
      toast.success("OTP verified successfully")
      if (mode === "verify") {
        router.push("/auth/login")
      } else {
        router.push(`/auth/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`)
      }
    },
    onError: () => {
      toast.error("Invalid OTP")
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!email) {
      toast.error("Email is required")
      return
    }
    if (otp.length < 6) {
      toast.error("Enter the full OTP")
      return
    }
    mutation.mutate()
  }

  return (
    <div className="w-full max-w-md">
      <Card className="border-border/60 shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">Enter OTP</CardTitle>
          <CardDescription>We sent a verification code to {email || "your email"}.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Verifying..." : "Verify OTP"}
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

export default function OtpPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md">
          <Card className="border-border/60 shadow-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-semibold">Enter OTP</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="h-10 rounded-md bg-gray-100" />
              <div className="h-10 rounded-md bg-gray-100" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <OtpForm />
    </Suspense>
  )
}
