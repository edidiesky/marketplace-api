import React from "react";

export default function Banner({ title }: { title: string }) {
  return (
    <div className="w-full relative h-[40px]">
      <img
        src="https://avada.website/classic-shop/wp-content/uploads/sites/48/2015/09/page_title_bar_bg.png"
        alt=""
        className="w-full absolute z-10 h-full object-cover"
      />
      <div className="w-full font-work_font text-xs text-white z-20 h-full relative flex items-center justify-center">
        {title}
      </div>
    </div>
  );
}
