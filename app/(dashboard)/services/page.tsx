"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Plus } from "lucide-react";
import { CustomPagination } from "@/components/custom-pagination";
import { DeleteModal } from "@/components/delete-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { createService, deleteService, getServices } from "@/lib/api";

export default function Services() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    image: null as File | null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
  });

  const services = data?.data ?? [];
  const itemsPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(services.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return services.slice(startIndex, startIndex + itemsPerPage);
  }, [services, currentPage]);

  const createMutation = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      toast.success("Service added successfully");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setShowForm(false);
      setFormData({ title: "", image: null });
    },
    onError: () => {
      toast.error("Failed to add service");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      toast.success("Service deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setDeleteModal({ open: false, id: null });
    },
    onError: () => {
      toast.error("Failed to delete service");
    },
  });

  const handleDelete = (id: string) => {
    setDeleteModal({ open: true, id });
  };

  const confirmDelete = () => {
    if (!deleteModal.id) return;
    deleteMutation.mutate(deleteModal.id);
  };

  const handleAddService = () => {
    if (!formData.title) {
      toast.error("Service title is required");
      return;
    }
    const payload = new FormData();
    payload.append("title", formData.title);
    if (formData.image) {
      payload.append("image", formData.image);
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-500 text-sm">Dashboard - Services</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white hover:bg-blue-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Added
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr
                    key={`service-skeleton-${index}`}
                    className="border-b border-gray-200"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr className="border-b border-gray-200">
                  <td className="px-6 py-6 text-sm text-gray-500" colSpan={3}>
                    No services found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.title}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                            {(item.title?.slice(0, 2) ?? "").toUpperCase()}
                          </div>
                        )}
                        <span className="text-gray-900 font-semibold">
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-3">
                        <Edit2 className="h-4 w-4 text-yellow-500 cursor-pointer hover:text-yellow-700" />
                        <Trash2
                          className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-700"
                          onClick={() => handleDelete(item._id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <CustomPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Service Name
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Money Transfer"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Icon
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  className="mt-1"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      image: e.target.files?.[0] ?? null,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddService}
                  className="bg-blue-500 text-white hover:bg-blue-600"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Adding..." : "Add Service"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <DeleteModal
        open={deleteModal.open}
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </div>
  );
}
