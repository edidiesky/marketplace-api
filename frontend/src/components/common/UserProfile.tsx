import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { clearCredentials, selectCurrentUser } from "@/redux/slices/authSlice";
import { useLogoutMutation } from "@/redux/services/authApi";
import { useGetAllStoresQuery } from "@/redux/services/storeApi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";

const UserProfile = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [logout] = useLogoutMutation();

  const { data: storesData } = useGetAllStoresQuery(
    {},
    { skip: !currentUser }
  );

  const firstStore = storesData?.data?.[0];

  const handleLogOut = async () => {
    try {
      await logout().unwrap();
      dispatch(clearCredentials());
      toast.success("You have been logged out successfully.");
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "data" in err &&
        typeof (err as { data?: { message?: string } }).data?.message === "string"
      ) {
        toast.error((err as { data: { message: string } }).data.message);
      } else {
        toast.error("Logout failed. Please try again.");
      }
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 outline-none">
            {currentUser.profileImage ? (
              <img
                src={currentUser.profileImage}
                alt="User avatar"
                className="w-10 h-10 object-cover rounded-full"
              />
            ) : (
              <div className="w-10 h-10 flex items-center justify-center text-white text-sm font-medium rounded-full bg-[#A1718A]">
                {currentUser.firstName?.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-[270px] border bg-white shadow-md">
          <div className="flex flex-col gap-4">
            <div className="flex w-full py-3 border-b px-4 items-center gap-3">
              <img
                src={
                  currentUser.profileImage ??
                  "https://fundednext.fra1.digitaloceanspaces.com/dashboard/demo-avatar.jpg"
                }
                className="w-10 h-10 object-cover rounded-full"
                alt="User avatar"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">
                  {currentUser.firstName} {currentUser.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentUser.email}
                </span>
              </div>
            </div>

            <div className="flex flex-col pb-3 border-b">
              {firstStore && (
                <>
                  <Link
                    to={`/dashboard/store/${firstStore._id}`}
                    className="text-sm px-4 py-2 hover:bg-muted text-foreground"
                  >
                    My Dashboard
                  </Link>
                  <Link
                    to={`/dashboard/store/${firstStore._id}/messages`}
                    className="text-sm px-4 py-2 hover:bg-muted text-foreground"
                  >
                    My Messages
                  </Link>
                </>
              )}
              <Link
                to={firstStore ? `/dashboard/store/${firstStore._id}/account` : "/onboarding"}
                className="text-sm px-4 py-2 hover:bg-muted text-foreground"
              >
                Account Settings
              </Link>
            </div>

            <button
              onClick={handleLogOut}
              className="w-full text-center py-2 text-sm font-semibold text-destructive hover:bg-muted transition-colors"
            >
              Sign Out
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserProfile;