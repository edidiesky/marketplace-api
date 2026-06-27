import Header from "@/components/dashboard/common/Header";
import Sidebar from "@/components/dashboard/common/Sidebar";
import { useDashboardTour } from "@/hooks/useDashboardTour";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

const DashboardLayout = () => {
  const { startTour } = useDashboardTour();
  useEffect(() => {
    startTour();
  }, []);
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
