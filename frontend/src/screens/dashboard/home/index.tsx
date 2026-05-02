import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import Title from "@/components/dashboard/common/Title";
import Stats from "@/components/dashboard/home/stats";
import Growth from "@/components/dashboard/home/growth";

export default function DashboardHome() {
  const currentUser = useSelector(selectCurrentUser);

  return (
    <div className="w-full p-6 lg:p-10 flex flex-col gap-8">
      {/* welcome */}
      <Title
        title={`Welcome ${currentUser?.firstName || "Victor"}`}
        description="This is your store home base. Review recent activity, monitor key usage,
        and jump back into your top actions quickly."
      />

      {/* stats grid */}
      <Stats />
      {/* analytics placeholder */}
      <Growth/>

    </div>
  );
}
