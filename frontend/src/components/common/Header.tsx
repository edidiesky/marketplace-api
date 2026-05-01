import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "@/redux/slices/authSlice";
import { useGetAllStoresQuery } from "@/redux/services/storeApi";

export default function Navbar() {
  const currentUser = useSelector(selectCurrentUser);
  const navigate = useNavigate();

  const { data: storesData } = useGetAllStoresQuery(
    {},
    { skip: !currentUser }
  );
  const firstStore = storesData?.data?.[0];

  const handleDashboard = () => {
    navigate(
      firstStore ? `/dashboard/store/${firstStore._id}` : "/onboarding"
    );
  };

  return (
    <nav
      className="w-full sticky top-0 z-50"
      style={{
        backgroundColor: "var(--color-canvas)",
        boxShadow: "rgba(0,0,0,0.04) 0px 0px 0px 1px",
      }}
    >
      <div
        className="mx-auto px-6 lg:px-8 h-16 flex items-center justify-between"
        style={{ maxWidth: "1280px" }}
      >
        <Link
          to="/"
          className="text-base font-semibold tracking-tight"
          style={{ color: "var(--color-ink)" }}
        >
          Selleasi
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "Pricing", "About"].map((item) => (
            <Link
              key={item}
              to={`/${item.toLowerCase()}`}
              className="text-base font-medium transition-opacity hover:opacity-60"
              style={{ color: "var(--color-ink)", letterSpacing: "-0.009em" }}
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <button
              onClick={handleDashboard}
              className="h-9 px-5 text-base font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--color-ink)",
                color: "var(--color-canvas)",
                borderRadius: "9999px",
              }}
            >
              Dashboard
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="h-9 px-5 text-base font-medium border transition-opacity hover:opacity-70 flex items-center"
                style={{
                  color: "var(--color-ink)",
                  borderColor: "var(--color-ink)",
                  borderRadius: "9999px",
                }}
              >
                Log in
              </Link>
              <Link
                to="/onboarding"
                className="h-9 px-5 text-sm font-medium transition-opacity hover:opacity-80 flex items-center"
                style={{
                  backgroundColor: "var(--color-ink)",
                  color: "var(--color-canvas)",
                  borderRadius: "9999px",
                }}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}