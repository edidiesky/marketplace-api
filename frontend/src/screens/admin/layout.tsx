import Header from "@/components/dashboard/common/Header";
import Sidebar from "@/components/dashboard/common/Sidebar";
import { Outlet } from "react-router-dom";
const DashboardLayout = () => {
  return (
    <div className="w-full py-2 pr-2 h-screen family2 overflow-hidden bg-[#f9f9f9]">
      <div className="flex w-full h-full items-start relative">
        <Sidebar />
      
        <div className="flex-1 h-full rounded-xl overflow-hidden bg-[#fff] relative flex flex-col gap-4">
          <div className="w-full flex h-full flex-col overflow-auto">
            {/* header */}
            <Header />
            <div className="w-full">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
