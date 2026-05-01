import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/redux/store";
export const useAppDispatch = () => useDispatch<AppDispatch>();
import { useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState } from "@/redux/store";
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
