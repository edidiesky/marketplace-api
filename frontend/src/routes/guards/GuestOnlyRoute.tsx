import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { selectAccessToken, selectCurrentUser } from "@/redux/slices/authSlice";
import type { User } from "@/types/api";

interface Props {
  children: React.ReactNode;
}

function getRedirectPath(user: User): string {
  if (user.userType === "ADMIN") return "/admin";
  if (user.userType === "SELLER") {
    return user.tenantId ? `/dashboard/store/${user.tenantId}` : "/onboarding";
  }
  return "/";
}

export function GuestOnlyRoute({ children }: Props) {
  const accessToken = useSelector(selectAccessToken);
  const currentUser = useSelector(selectCurrentUser);

  if (accessToken && currentUser) {
    return <Navigate to={getRedirectPath(currentUser)} replace />;
  }

  return <>{children}</>;
}
