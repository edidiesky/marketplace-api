
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaInfoCircle,
} from "react-icons/fa";
import { toast } from "sonner";
interface CustomToastProps {
  message: string;
  type: "success" | "error" | "info";
}
export default function CustomToast({ message, type }: CustomToastProps) {
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
    </div>
  );
}

/** MY UTILITY FUNCTION FOR CREATING A TOAST */
export const showToast = (
  message: string,
  type: "success" | "error" | "info"
) => {
  toast.custom(() => <CustomToast message={message} type={type} />);
};
