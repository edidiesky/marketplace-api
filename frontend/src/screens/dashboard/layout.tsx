import Header from "@/components/dashboard/common/Header";
import Sidebar from "@/components/dashboard/common/Sidebar";
import { Outlet } from "react-router-dom";

const DashboardLayout = () => {
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-white">
      <Header />
      <div className="flex flex-1 w-full max-w-[1280px] mx-auto overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;