import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useGetMyStoresQuery } from "@/redux/services/storeApi";
import AuthLayout from "./shared/AuthLayout";
import { Store, Plus, Loader2 } from "lucide-react";
import type { Store as StoreType } from "@/types/api";

export default function SelectStore() {
  const navigate    = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const { data: myStoreData, isLoading } = useGetMyStoresQuery(undefined);

  const stores: StoreType[] = myStoreData?.data?.stores ?? [];

  return (
    <AuthLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h1
            className="text-[28px] font-semibold leading-[1.1]"
            style={{ color: "var(--color-ink)", letterSpacing: "-0.5px" }}
          >
            Welcome back{currentUser?.name ? `, ${currentUser.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-[15px]" style={{ color: "var(--color-muted-stone)" }}>
            Select a store to continue or create a new one.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2
                size={16}
                className="animate-spin"
                style={{ color: "var(--color-muted-stone)" }}
              />
              <span className="text-sm" style={{ color: "var(--color-muted-stone)" }}>
                Loading your stores...
              </span>
            </div>
          ) : stores.length > 0 ? (
            stores.map((store) => {
              const storeId = store.storeId ?? store._id ?? "";
              return (
                <button
                  key={storeId}
                  onClick={() => navigate(`/dashboard/store/${storeId}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-[14px] border-2 text-left transition-all hover:border-[var(--color-ink)]"
                  style={{
                    borderColor:     "var(--color-stone-surface)",
                    backgroundColor: "var(--color-canvas)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 text-base font-semibold"
                    style={{
                      backgroundColor: "var(--color-fog)",
                      color:           "var(--color-ink)",
                    }}
                  >
                    {store.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {store.name}
                    </span>
                    <span
                      className="text-xs truncate"
                      style={{ color: "var(--color-muted-stone)" }}
                    >
                      {store.subdomain}.selleasi.com
                    </span>
                  </div>
                  <Store
                    size={16}
                    className="ml-auto shrink-0"
                    style={{ color: "var(--color-muted-stone)" }}
                  />
                </button>
              );
            })
          ) : (
            <p className="text-sm" style={{ color: "var(--color-muted-stone)" }}>
              You have no stores yet.
            </p>
          )}

          <button
            onClick={() => navigate("/onboarding/create-store")}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-[12px] border text-sm font-medium transition-opacity hover:opacity-70"
            style={{
              borderColor: "var(--color-stone-surface)",
              color:       "var(--color-ink)",
            }}
          >
            <Plus size={15} />
            Create a new store
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}