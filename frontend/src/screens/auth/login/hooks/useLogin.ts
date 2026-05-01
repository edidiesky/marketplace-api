import { useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { setOtpPending, setOnboardingEmail } from "@/redux/slices/authSlice";
import { useLoginMutation } from "@/redux/services/authApi";
import type { LoginFormData } from "../schema/login.schema";

export function useLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? null;

  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async (data: LoginFormData) => {
    try {
      await login({ email: data.email, password: data.password }).unwrap();
      dispatch(setOnboardingEmail(data.email));
      dispatch(setOtpPending({ pendingUserId: data.email }));
      navigate("/verify-otp", { state: { from } });
    } catch {
      // handled by rtkQueryErrorMiddleware
    }
  };

  return { handleLogin, isLoading };
}