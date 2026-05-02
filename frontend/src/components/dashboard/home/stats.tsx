import { statBlocks } from "@/constants/mocks";
import React from "react";

export default function Stats() {
  return (
    <div className="w-full border p-4 rounded-sm flex flex-col gap-6">
      <div className="w-full flex border-b pb-3 flex-col gap-1">
        <h3 className="text-xl">Store Performance Report</h3>
        <p className="text-sm font-selleasy_normal text-[#64645f] max-w-[520px] leading-[1.6]">
          Monitor how effectively your store is meeting sales targets.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {statBlocks.map((block, i) => (
          <div
            key={block.id}
            className={`flex flex-col gap-3 ${i < statBlocks.length - 1 ? "lg:border-r px-4 border-b lg:border-b-0 border-[#e8e6e3]" : "px-4"}`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-[#a3a6af] font-dashboard_regular">
              {block.label}
            </p>
            <div>
              <p className="text-3xl font-bold text-[#17191c]">
                {block.value}
              </p>
              <p className="text-xs text-[#777b86] font-selleasy_normal mt-0.5">
                {block.sub}
              </p>
            </div>
            <div className="w-full h-1.5 bg-[#f2f0ed]">
              <div
                className="h-full rounded-full bg-[#5d2a1a]"
                style={{ width: `${block.progress}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 ${block.deltaPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                {block.deltaPositive ? "+" : "-"}
                {block.delta}
              </span>
              <span className="text-xs text-[#777b86] font-selleasy_normal">
                {block.deltaNote}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
