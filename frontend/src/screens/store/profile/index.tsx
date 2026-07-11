import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useGetUserQuery } from "@/redux/services/userApi";
import { PROFILE_TABS, type ProfileTab } from "./profile.types";
import AccountTab from "./AccountTab";
import OrdersTab from "./OrdersTab";
import SecurityTab from "./SecurityTab";
import AddressTab from "./AddressTab";
import NotificationsTab from "./NotificationsTab";

export default function BuyerProfile() {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [activeTab, setActiveTab] = useState<ProfileTab>("account");
  const { data: userResponse } = useGetUserQuery(currentUser?.userId ?? "", {
    skip: !currentUser?.userId,
  });
  const user = userResponse?.data;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center flex flex-col gap-4">
          <p className="text-sm text-[#666]">You need to be signed in to view your profile.</p>
          <button
            onClick={() => navigate("/login")}
            className="h-10 px-6 bg-[#171717] text-white text-sm hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const displayName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || currentUser.name
    : currentUser.name;
  return (
    <div className="w-full min-h-screen bg-[#FAF8F5]">
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12 flex flex-col gap-8">

        {/* header */}
        <p className="text-xl lg:text-2xl bold text-[#171717]">{displayName}</p>

        {/* tab bar */}
        <div className="flex items-center border-b border-[#e8e6e3] overflow-x-auto">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-[#171717] text-[#171717]"
                  : "border-transparent text-[#777] hover:text-[#171717]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* tab content — each tab owns its own queries/forms */}
        {activeTab === "account"       && <AccountTab currentUser={currentUser} />}
        {activeTab === "orders"        && <OrdersTab />}
        {activeTab === "security"      && <SecurityTab />}
        {activeTab === "address"       && <AddressTab />}
        {activeTab === "notifications" && <NotificationsTab />}

      </div>
    </div>
  );
}