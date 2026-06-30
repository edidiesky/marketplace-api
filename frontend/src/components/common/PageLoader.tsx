export default function PageLoader() {
  return (
    <div className="w-full h-screen flex items-center justify-center"
         style={{ backgroundColor: "var(--color-fog)" }}>
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
           style={{ borderColor: "var(--color-ink)", borderTopColor: "transparent" }} />
    </div>
  );
}