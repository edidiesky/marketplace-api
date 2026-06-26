import { useNavigate } from "react-router-dom";
import { useCreateStoreMutation } from "@/redux/services/storeApi";
import StepCreateStore from "./onboarding/steps/StepCreateStore";
import AuthLayout from "./shared/AuthLayout";
import { showToast } from "@/components/common/Toast";
import type { StoreFormData } from "./onboarding/schema/onboarding.schema";

export default function CreateStore() {
  const navigate = useNavigate();
  const [createStore, { isLoading }] = useCreateStoreMutation();

  const handleSubmit = async (data: StoreFormData) => {
    try {
      const result = await createStore({
        name:        data.name,
        subdomain:   data.subdomain,
        description: data.description,
        email:       data.email,
      }).unwrap();
      showToast("Store created! Let's start selling.", "success");
      const storeId = result.data?.storeId ?? result.data?._id;
      navigate(storeId ? `/dashboard/store/${storeId}` : "/dashboard/store");
    } catch (err: unknown) {
      const error = err as { data?: { error?: string[] }; error?: string };
      (error?.data?.error ?? [error?.error ?? "Unknown error"]).forEach((m) =>
        showToast(m, "error")
      );
    }
  };

  return (
    <AuthLayout>
      <StepCreateStore onSubmit={handleSubmit} isLoading={isLoading} />
    </AuthLayout>
  );
}