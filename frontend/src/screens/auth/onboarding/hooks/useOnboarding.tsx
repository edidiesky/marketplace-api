import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setOnboardingEmail } from "@/redux/slices/authSlice";
import {
  useVerifyEmailMutation,
  useVerifyPasswordMutation,
  useRegisterMutation,
} from "@/redux/services/authApi";
import { useCreateStoreMutation } from "@/redux/services/storeApi";
import toast from "react-hot-toast";
import type {
  EmailFormData,
  PasswordFormData,
  DetailsFormData,
  StoreFormData,
} from "../schema/onboarding.schema";

export function useOnboarding(email: string, onNext: () => void) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [verifyEmail, { isLoading: sendingEmail }] = useVerifyEmailMutation();
  const [verifyPassword, { isLoading: settingPassword }] =
    useVerifyPasswordMutation();
  const [register, { isLoading: registering }] = useRegisterMutation();
  const [createStore, { isLoading: creatingStore }] = useCreateStoreMutation();

  const handleEmail = async (data: EmailFormData) => {
    try {
      const result = await verifyEmail({ email: data.email }).unwrap();
      dispatch(setOnboardingEmail(data.email));
      toast.success(result.message);
      onNext();
    } catch {
      // error handled by rtkQueryErrorMiddleware
    }
  };

  const handlePassword = async (data: PasswordFormData) => {
    try {
      await verifyPassword({ email, password: data.password }).unwrap();
      onNext();
    } catch {
      // error handled by rtkQueryErrorMiddleware
    }
  };

  const handleDetails = async (data: DetailsFormData) => {
    try {
      await register({
        email,
        firstName: data.firstName,
        lastName: data.lastName,
        userType: data.userType,
      }).unwrap();
      onNext();
    } catch {
      // error handled by rtkQueryErrorMiddleware
    }
  };

  const handleCreateStore = async (data: StoreFormData) => {
    try {
      const result = await createStore({
        name: data.name,
        subdomain: data.subdomain,
        description: data.description,
      }).unwrap();
      toast.success("Store created. Welcome to Selleasi.");
      navigate(`/dashboard/store/${result.data._id}`);
    } catch {
      // error handled by rtkQueryErrorMiddleware
    }
  };

  return {
    handleEmail,
    handlePassword,
    handleDetails,
    handleCreateStore,
    isLoading:
      sendingEmail || settingPassword || registering || creatingStore,
    sendingEmail,
    settingPassword,
    registering,
    creatingStore,
  };
}