import Header from "@/components/store/common/Header";
import { Outlet } from "react-router-dom";
const StoreLayout = () => {
  return (
    <div className="w-full">
      <Header />
      <Outlet />
    </div>
  );
};

export default StoreLayout;
