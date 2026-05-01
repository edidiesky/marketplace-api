import { Outlet } from "react-router-dom";
const MainLayout = () => {
  return (
    <div className="w-full">
      <Outlet />
    </div>
  );
};

export default MainLayout;
