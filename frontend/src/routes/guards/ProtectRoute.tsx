import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { selectCurrentUser, selectAccessToken } from "@/redux/slices/authSlice";

interface Props {
  children: React.ReactNode;
  allowedRoles?: Array<"BUYER" | "SELLER" | "ADMIN">;
}

export function ProtectRoute({ children, allowedRoles }: Props) {
  const accessToken = useSelector(selectAccessToken);
  const currentUser = useSelector(selectCurrentUser);
  const location = useLocation();

  if (!accessToken || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.userType)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}