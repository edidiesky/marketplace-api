import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { selectCurrentUser, selectAccessToken } from "@/redux/slices/authSlice";

interface Props {
  children: React.ReactNode;
}

export function ProtectRoute({ children }: Props) {
  const accessToken = useSelector(selectAccessToken);
  const currentUser = useSelector(selectCurrentUser);
  const location    = useLocation();

  if (!accessToken || !currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}