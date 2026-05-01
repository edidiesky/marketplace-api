import Header from "@/components/dashboard/common/Header";
import Sidebar from "@/components/dashboard/common/Sidebar";
import { Outlet } from "react-router-dom";

const DashboardLayout = () => {
  return (
    <div
      className="w-full h-screen overflow-hidden flex"
      style={{ backgroundColor: "#f5f5f3" }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;