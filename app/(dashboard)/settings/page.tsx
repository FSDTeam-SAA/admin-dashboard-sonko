"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getAdminSettings, setAdminSetting } from "@/lib/api";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getAdminSettings,
  });

  const settings = data?.data ?? [];
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (settings.length > 0) {
      const nextDrafts: Record<string, number> = {};
      settings.forEach((setting) => {
        nextDrafts[setting.transactionType] = setting.percentage;
      });
      setDrafts(nextDrafts);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: setAdminSetting,
    onSuccess: () => {
      toast.success("Setting updated");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: () => {
      toast.error("Failed to update setting");
    },
  });

  const handleSave = (transactionType: string) => {
    const percentage = drafts[transactionType];
    if (percentage === undefined || Number.isNaN(percentage)) {
      toast.error("Enter a valid percentage");
      return;
    }
    mutation.mutate({ transactionType, percentage });
  };

  return (
    <div className="p-8 bg-gray-50">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Dashboard - Settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Charges</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Transaction Type
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr
                    key={`setting-skeleton-${index}`}
                    className="border-b border-gray-200"
                  >
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  </tr>
                ))
              ) : settings.length === 0 ? (
                <tr className="border-b border-gray-200">
                  <td className="px-6 py-6 text-sm text-gray-500" colSpan={3}>
                    No admin settings found.
                  </td>
                </tr>
              ) : (
                settings.map((setting) => (
                  <tr key={setting._id} className="border-b border-gray-200">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {setting.transactionType}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={
                            drafts[setting.transactionType] ??
                            setting.percentage
                          }
                          onChange={(e) =>
                            setDrafts({
                              ...drafts,
                              [setting.transactionType]: Number(e.target.value),
                            })
                          }
                          className="w-28"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        onClick={() => handleSave(setting.transactionType)}
                        className="bg-blue-500 text-white"
                        disabled={mutation.isPending}
                      >
                        {mutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
