import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface ModalState {
  login: boolean;
  register: boolean;
  category: { open: boolean; id: string | null };
  size: { open: boolean; id: string | null };
  color: { open: boolean; id: string | null };
  product: { open: boolean; id: string | null };
  delete: { open: boolean; id: string | null };
}

const initialState: ModalState = {
  login: false,
  register: false,
  category: { open: false, id: null },
  size: { open: false, id: null },
  color: { open: false, id: null },
  product: { open: false, id: null },
  delete: { open: false, id: null },
};

const modalSlice = createSlice({
  name: "modals",
  initialState,
  reducers: {
    openLoginModal: (state) => {
      state.login = true;
    },
    closeLoginModal: (state) => {
      state.login = false;
    },
    openRegisterModal: (state) => {
      state.register = true;
    },
    closeRegisterModal: (state) => {
      state.register = false;
    },
    openCategoryModal: (state, action: PayloadAction<string | null>) => {
      state.category = { open: true, id: action.payload };
    },
    closeCategoryModal: (state) => {
      state.category = { open: false, id: null };
    },
    openSizeModal: (state, action: PayloadAction<string | null>) => {
      state.size = { open: true, id: action.payload };
    },
    closeSizeModal: (state) => {
      state.size = { open: false, id: null };
    },
    openColorModal: (state, action: PayloadAction<string | null>) => {
      state.color = { open: true, id: action.payload };
    },
    closeColorModal: (state) => {
      state.color = { open: false, id: null };
    },
    openProductModal: (state, action: PayloadAction<string | null>) => {
      state.product = { open: true, id: action.payload };
    },
    closeProductModal: (state) => {
      state.product = { open: false, id: null };
    },
    openDeleteModal: (state, action: PayloadAction<string | null>) => {
      state.delete = { open: true, id: action.payload };
    },
    closeDeleteModal: (state) => {
      state.delete = { open: false, id: null };
    },
  },
});

export const {
  openLoginModal,
  closeLoginModal,
  openRegisterModal,
  closeRegisterModal,
  openCategoryModal,
  closeCategoryModal,
  openSizeModal,
  closeSizeModal,
  openColorModal,
  closeColorModal,
  openProductModal,
  closeProductModal,
  openDeleteModal,
  closeDeleteModal,
} = modalSlice.actions;

export default modalSlice.reducer;
