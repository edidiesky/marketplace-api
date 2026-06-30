import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--color-fog)" }}>
      <div className="max-w-md w-full bg-white p-10 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className=" leading-none" style={{ fontSize: "64px", color: "var(--color-ink)", letterSpacing: "-2px" }}>404</p>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px]  leading-[1.1]" style={{ color: "var(--color-ink)", letterSpacing: "-0.5px" }}>
            Page not found
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted-stone)" }}>
            The page you're looking for doesn't exist or has been moved. If you followed a link, it may be outdated.
          </p>
        </div>
        <div className="p-4 flex flex-col gap-3 border rounded-xl" style={{ borderColor: "var(--color-stone-surface)", backgroundColor: "var(--color-fog)" }}>
          <p className="text-xs  uppercase" style={{ color: "var(--color-muted-stone)" }}>Try one of these instead</p>
          {[
            "Check the URL for typos",
            "Go back to the previous page",
            "Return to the homepage and navigate from there",
          ].map((s, i) => (
            <div key={s} className="flex items-start gap-3">
              <span className="w-8 h-8 flex items-center justify-center text-sm rounded-xl shrink-0 mt-0.5" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-canvas)" }}>{i + 1}</span>
              <p className="text-base" style={{ color: "var(--color-muted-stone)" }}>{s}</p>
            </div>
          ))}
        </div>
        <button onClick={() => navigate(-1)} className="w-full h-12 flex items-center justify-center text-base rounded-full  transition-opacity hover:opacity-80" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-canvas)" }}>
         Go back
        </button>
        <button onClick={() => navigate("/")} className="w-full h-12 flex items-center justify-center text-base rounded-full  border transition-opacity hover:opacity-70" style={{ color: "var(--color-ink)", borderColor: "var(--color-ink)" }}>
          Return to homepage
        </button>
      </div>
    </div>
  );
}