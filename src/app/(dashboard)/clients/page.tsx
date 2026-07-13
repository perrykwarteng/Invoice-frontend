"use client";

import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import Button from "@/components/ui/btn";
import { ConfirmationModal } from "@/components/ui/confirmationModal";
import { CustomTable } from "@/components/ui/CustomTable";
import CustomInput from "@/components/ui/Input";
import { Modal } from "@/components/ui/modal";
import {
  createClient,
  deleteClient,
  editClient,
  getClient,
} from "@/services/client";
import { ClientResponseType, ClientType } from "@/types/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DiamondPlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Clients() {
  const queryClient = useQueryClient();
  const { data: clientData, isLoading } = useQuery({
    queryKey: ["Clients"],
    queryFn: getClient,
    staleTime: 0,
  });

  const [isEdit, setIsEdit] = useState(false);
  const [open, setOpen] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [id, setId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientType>({
    name: "",
    email: "",
    address: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const { mutate: createClientMutate, isPending: createLoading } = useMutation({
    mutationKey: ["CreateClient"],
    mutationFn: createClient,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["Clients"] });
      setForm({
        name: "",
        email: "",
        address: "",
      });
      setIsEdit(false);
      setOpen(false);
    },
    onError: (data) => {
      toast.error(data.message);
    },
  });

  const { mutate: editClientMutate, isPending: editLoading } = useMutation({
    mutationKey: ["EditeClient"],
    mutationFn: editClient,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["Clients"] });
      setForm({
        name: "",
        email: "",
        address: "",
      });
      setIsEdit(false);
      setOpen(false);
    },
    onError: (data) => {
      toast.error(data.message);
    },
  });
  const { mutate: deleteClientMutate, isPending: deleteLoading } = useMutation({
    mutationKey: ["DeleteClient"],
    mutationFn: deleteClient,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["Clients"] });
      setOpenConfirm(false);
    },
    onError: (data) => {
      toast.error(data.message);
    },
  });

  const handleEdit = (client: ClientResponseType) => {
    setId(client.id);

    setForm({
      name: client.name,
      email: client.email,
      address: client.address,
    });

    setIsEdit(true);
    setOpen(true);
  };

  const handleAdd = () => {
    createClientMutate(form);

    setIsEdit(false);
    setOpen(true);
  };

  const editClientData = () => {
    editClientMutate({
      id: id!,
      name: form.name,
      email: form.email,
      address: form.address,
    });
  };

  const openDeleteConfirm = (id: number) => {
    setId(id);
    setOpenConfirm(true);
  };

  return (
    <DashboardLayout>
      <div className="min-h-full">
        <div className="">
          <DashboardHeader title="Clients" subtitle="List of clients">
            <Button
              className="group"
              leftIcon={
                <DiamondPlus className="w-5 h-5 transition-transform duration-150 group-hover:rotate-45" />
              }
              onClick={() => setOpen(true)}
            >
              Add Client
            </Button>
          </DashboardHeader>
        </div>

        <div className="flex items-center gap-x-3">
          <div className="w-100">
            <CustomInput
              type="text"
              id="search"
              placeholder="search clients..."
              onChange={() => {}}
            />
          </div>
        </div>

        <div className="mt-5">
          <CustomTable
            data={clientData?.reverse() ?? []}
            pageSize={5}
            getRowId={(client) => client.id}
            loading={isLoading}
            columns={[
              { key: "name", title: "Client Name" },
              { key: "email", title: "Client Email" },
              { key: "address", title: "Client Address" },
            ]}
            showActions
            renderActions={(client) => (
              <div className="flex items-center justify-end gap-2">
                <button
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md
                  bg-accent/10 text-accent hover:bg-accent/20 transition"
                  onClick={() => handleEdit(client)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md
                  bg-red-50 text-red-600 hover:bg-red-100 transition"
                  onClick={() => openDeleteConfirm(client.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          />
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title={isEdit ? "Edit Client" : "Add Client"}
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setForm({
                  name: "",
                  email: "",
                  address: "",
                });
              }}
              className="px-4 py-2 rounded-lg border"
              loading={isEdit ? editLoading : createLoading}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={isEdit ? editClientData : handleAdd}
              className=""
              loading={isEdit ? editLoading : createLoading}
            >
              {isEdit ? "Update Client" : "Add Client"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <CustomInput
            label="Company Name"
            type="text"
            id="name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Royal Energy Solutions"
          />

          <CustomInput
            label="Company Email"
            type="email"
            id="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="info@royalenergygh.com"
          />

          <CustomInput
            label="Company Address"
            type="text"
            id="address"
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Tamale, Northern Region"
          />
        </div>
      </Modal>

      <ConfirmationModal
        open={openConfirm}
        title="Confirm Deletions"
        message={"Are you sure you want to delete this client"}
        onConfirm={() => {
          deleteClientMutate(id!);
        }}
        onCancel={() => setOpenConfirm(false)}
      />
    </DashboardLayout>
  );
}
