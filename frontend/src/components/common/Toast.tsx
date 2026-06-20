
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { toast } from "sonner";
interface ToastAction {
  label: string;
  onClick: () => void;
}

interface CustomToastProps {
  message: string;
  type: "success" | "error" | "info";
  action?: ToastAction;
}

export default function CustomToast({ message, type, action }: CustomToastProps) {
  const Icon = () => {
    switch (type) {
      case "success":
        return <FaCheckCircle className="toast-icon success" />;
      case "error":
        return <FaExclamationCircle className="toast-icon error" />;
      case "info":
      default:
        return <FaInfoCircle className="toast-icon info" />;
    }
  };
  return (
    <div className={`custom-toast border ${type}`}>
      <Icon />
      <span className="toast-message bold">{message}</span>
      {action && (
        <button className="toast-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}


export const showToast = (
  message: string,
  type: "success" | "error" | "info",
   options?: { id?: string; duration?: number; action?: ToastAction },
) => {
   toast.custom(() => <CustomToast message={message} type={type} action={options?.action} />, {
    id: options?.id,
    duration: options?.duration,
  });
};
