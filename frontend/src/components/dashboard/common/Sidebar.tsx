import { useDispatch, useSelector } from "react-redux";
import { NavLink, Link, useNavigate, useParams } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuPackage,
  LuShoppingCart,
  LuUsers,
  LuMessageSquare,
  LuMegaphone,
  LuTag,
  LuPalette,
  LuRuler,
  LuSettings,
  LuLogOut,
  LuWallet,
  LuBoxes,
  LuCreditCard,
} from "react-icons/lu";
import { selectCurrentUser, clearCredentials } from "@/redux/slices/authSlice";
import { useLogoutMutation } from "@/redux/services/authApi";
import toast from "react-hot-toast";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { icon: LuLayoutDashboard, text: "Dashboard", path: "" },
      { icon: LuBoxes, text: "Analytics", path: "analytics" },
    ],
  },
  {
    label: "Store",
    items: [
      { icon: LuPackage, text: "Products", path: "products" },
      { icon: LuCreditCard, text: "Payments", path: "payments" },
      { icon: LuBoxes, text: "Inventory", path: "inventory" },
      { icon: LuShoppingCart, text: "Orders", path: "orders" },
      // { icon: LuTag, text: "Categories", path: "categories" },
      // { icon: LuPalette, text: "Colors", path: "colors" },
      // { icon: LuRuler, text: "Sizes", path: "sizes" },
    ],
  },
  {
    label: "Customers",
    items: [
      { icon: LuUsers, text: "Customers", path: "customers" },
      { icon: LuMessageSquare, text: "Messages", path: "messages" },
      { icon: LuMegaphone, text: "Marketing", path: "marketing" },
    ],
  },
  {
    label: "Finance",
    items: [{ icon: LuWallet, text: "Payouts", path: "payouts" }],
  },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const currentUser = useSelector(selectCurrentUser);
  const [logout] = useLogoutMutation();

  const base = `/dashboard/store/${id}`;

  const handleSignOut = async () => {
    try {
      await logout().unwrap();
      dispatch(clearCredentials());
      navigate("/");
      toast.success("Signed out successfully.");
    } catch {
      toast.error("Sign out failed. Please try again.");
    }
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-[220px] h-screen shrink-0 border-r"
      style={{
        backgroundColor: "#ffffff",
        borderColor: "#ebebeb",
      }}
    >
      {/* nav */}
      <nav className="flex-1 overflow-y-auto py-8 px-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p
              className="text-[11px] font-semibold uppercase tracking-widest px-2 mb-1.5"
              style={{ color: "#a3a6af" }}
            >
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const to = item.path ? `${base}/${item.path}` : base;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={!item.path}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-sm font-medium transition-colors w-full mb-0.5",
                      isActive
                        ? "bg-[#f5f5f3] text-[#17191c]"
                        : "text-[#4c4c4c] hover:bg-[#f5f5f3] hover:text-[#17191c]",
                    ].join(" ")
                  }
                >
                  <Icon size={15} className="shrink-0" />
                  {item.text}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* user + signout */}
      <div className="border-t p-3 shrink-0" style={{ borderColor: "#ebebeb" }}>
        <Link
          to={`${base}/account`}
          className="flex items-center gap-2.5 px-2 py-2 rounded-[8px] hover:bg-[#f5f5f3] transition-colors mb-1 w-full"
        >
          {currentUser?.profileImage ? (
            <img
              src={currentUser.profileImage}
              alt="avatar"
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
              style={{ backgroundColor: "#17191c" }}
            >
              {currentUser?.firstName?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-medium truncate"
              style={{ color: "#17191c" }}
            >
              {currentUser?.firstName} {currentUser?.lastName}
            </p>
            <p className="text-[11px] truncate" style={{ color: "#a3a6af" }}>
              {currentUser?.email}
            </p>
          </div>
          <LuSettings
            size={13}
            style={{ color: "#a3a6af" }}
            className="shrink-0"
          />
        </Link>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] font-medium transition-colors w-full hover:bg-[#fff0f0]"
          style={{ color: "#777b86" }}
        >
          <LuLogOut size={14} className="shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
