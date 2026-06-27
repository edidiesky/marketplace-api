import Header from "@/components/store/common/Header";
import { Outlet } from "react-router-dom";
const StoreLayout = () => {
  return (
    <div className="w-full bg-[#FAF8F5]">
      <Header />
      <Outlet />
    </div>
  );
};

export default StoreLayout;
