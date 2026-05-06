import Header from "@/components/dashboard/common/Header";
import AdminSidebar from "@/components/admin/common/AdminSidebar";
import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden bg-white">
      <Header />
      <div className="flex flex-1 w-full max-w-[1280px] mx-auto overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;