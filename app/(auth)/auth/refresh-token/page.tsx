"use client"

import { useMutation } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { authRefreshToken } from "@/lib/api"

export default function RefreshTokenPage() {
  const { data: session } = useSession()

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session?.refreshToken) {
        throw new Error("Missing refresh token")
      }
      return authRefreshToken({ refreshToken: session.refreshToken })
    },
    onSuccess: () => {
      toast.success("Token refreshed successfully")
    },
    onError: () => {
      toast.error("Unable to refresh token")
    },
  })

  return (
    <div className="w-full max-w-md">
      <Card className="border-border/60 shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl font-semibold">Refresh Token</CardTitle>
          <CardDescription>Manually refresh your access token if needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Refreshing..." : "Refresh Token"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
