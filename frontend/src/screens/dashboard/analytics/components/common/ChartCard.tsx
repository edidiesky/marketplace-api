function ChartCard({
  title,
  description,
  height = "h-[220px]",
  colSpan2 = false,
}: {
  title: string;
  description: string;
  height?: string;
  colSpan2?: boolean;
}) {
  return (
    <div className={`border border-[#e8e6e3] flex flex-col${colSpan2 ? " lg:col-span-2" : ""}`}>
      <div className="px-5 py-4 border-b border-[#e8e6e3]">
        <p className="text-base font-semibold text-[#17191c] font-dashboard_regular">{title}</p>
        <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">{description}</p>
      </div>
      <div className={`${height} flex items-center justify-center`}>
        <p className="text-xs text-[#a3a6af] font-selleasy_normal">Chart renders here</p>
      </div>
    </div>
  );
}


export default ChartCard