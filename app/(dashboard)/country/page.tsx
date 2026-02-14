"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { CustomPagination } from "@/components/custom-pagination";
import { DeleteModal } from "@/components/delete-modal";
import { toast } from "sonner";
import { createCountry, deleteCountry, getCountries, updateCountry, type Country } from "@/lib/api";

export default function Country() {
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
  const [editModal, setEditModal] = useState<{ open: boolean; item: Country | null }>({
    open: false,
    item: null,
  });
  const [formData, setFormData] = useState({
    title: "",
    alphaChar: "",
    countryCode: "",
    image: null as File | null,
  });
  const [editFormData, setEditFormData] = useState({
    title: "",
    alphaChar: "",
    countryCode: "",
    image: null as File | null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["countries"],
    queryFn: getCountries,
  });

  const countries = data?.data ?? [];

  const itemsPerPage = 12;
  const totalPages = Math.max(1, Math.ceil(countries.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return countries.slice(startIndex, startIndex + itemsPerPage);
  }, [countries, currentPage]);

  const createMutation = useMutation({
    mutationFn: createCountry,
    onSuccess: () => {
      toast.success("Country added successfully");
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      setShowForm(false);
      setFormData({ title: "", alphaChar: "", countryCode: "", image: null });
    },
    onError: () => {
      toast.error("Failed to add country");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCountry,
    onSuccess: () => {
      toast.success("Country deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      setDeleteModal({ open: false, id: null });
    },
    onError: () => {
      toast.error("Failed to delete country");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FormData }) => updateCountry(id, payload),
    onSuccess: () => {
      toast.success("Country updated successfully");
      queryClient.invalidateQueries({ queryKey: ["countries"] });
      setEditModal({ open: false, item: null });
      setEditFormData({ title: "", alphaChar: "", countryCode: "", image: null });
    },
    onError: () => {
      toast.error("Failed to update country");
    },
  });

  const handleAddCountry = () => {
    if (!formData.title || !formData.alphaChar || !formData.countryCode) {
      toast.error("All fields are required");
      return;
    }

    const payload = new FormData();
    payload.append("title", formData.title);
    payload.append("alphaChar", formData.alphaChar);
    payload.append("countryCode", formData.countryCode);
    if (formData.image) {
      payload.append("image", formData.image);
    }

    createMutation.mutate(payload);
  };

  const confirmDelete = () => {
    if (!deleteModal.id) return;
    deleteMutation.mutate(deleteModal.id);
  };

  const openEditModal = (item: Country) => {
    setEditModal({ open: true, item });
    setEditFormData({
      title: item.title ?? "",
      alphaChar: item.alphaChar ?? "",
      countryCode: item.countryCode ?? "",
      image: null,
    });
  };

  const handleUpdateCountry = () => {
    if (!editModal.item?._id) return;
    if (!editFormData.title || !editFormData.alphaChar || !editFormData.countryCode) {
      toast.error("All fields are required");
      return;
    }
    const payload = new FormData();
    payload.append("title", editFormData.title);
    payload.append("alphaChar", editFormData.alphaChar);
    payload.append("countryCode", editFormData.countryCode);
    if (editFormData.image) {
      payload.append("image", editFormData.image);
    }
    updateMutation.mutate({ id: editModal.item._id, payload });
  };

  return (
    <div className="p-8 bg-gray-50">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Country</h1>
          <p className="text-gray-500 text-sm">Dashboard - Country</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-blue-500 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Country Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Country Phone Code
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
                    key={`skeleton-${index}`}
                    className="border-b border-gray-200"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
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
                  <td className="px-6 py-6 text-sm text-gray-500" colSpan={4}>
                    No countries found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-gray-200 hover:bg-gray-50"
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
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 text-xs">
                              {item.title.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-gray-900 font-medium">
                          {item.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.countryCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <Edit2
                        className="h-4 w-4 text-blue-500 cursor-pointer"
                        onClick={() => openEditModal(item)}
                      />
                      <Trash2
                        className="h-4 w-4 text-red-500 cursor-pointer"
                        onClick={() =>
                          setDeleteModal({ open: true, id: item._id })
                        }
                      />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Add Country</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Country Name</label>
                <Input
                  placeholder="Country name"
                  className="mt-1"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Country Alpha</label>
                <Input
                  placeholder="e.g., GM"
                  className="mt-1"
                  value={formData.alphaChar}
                  onChange={(e) =>
                    setFormData({ ...formData, alphaChar: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Country Phone Code
                </label>
                <Input
                  placeholder="Type phone code"
                  className="mt-1"
                  value={formData.countryCode}
                  onChange={(e) =>
                    setFormData({ ...formData, countryCode: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Flag</label>
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCountry}
                  className="bg-blue-500 text-white"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {editModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Update Country</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Country Name</label>
                <Input
                  placeholder="Country name"
                  className="mt-1"
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Country Alpha</label>
                <Input
                  placeholder="e.g., GM"
                  className="mt-1"
                  value={editFormData.alphaChar}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      alphaChar: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Country Phone Code
                </label>
                <Input
                  placeholder="Type phone code"
                  className="mt-1"
                  value={editFormData.countryCode}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      countryCode: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Flag</label>
                <Input
                  type="file"
                  accept="image/*"
                  className="mt-1"
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      image: e.target.files?.[0] ?? null,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditModal({ open: false, item: null })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateCountry}
                  className="bg-blue-500 text-white"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <DeleteModal
        open={deleteModal.open}
        title="Delete Country"
        description="Are you sure you want to delete this country? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </div>
  );
}
