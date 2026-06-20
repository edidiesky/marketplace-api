import { Toaster } from "sonner";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors={false}
      closeButton={false}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "sonner-root",
        },
      }}
    />
  );
}