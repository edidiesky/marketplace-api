import React from "react";

export default function ProductImage({
  data,
}: {
  data: { images: string[] };
  // data: { images: string[] | string };
}) {
  console.log("images:", data?.images)
  
  return (
    <div className="w-full lg:w-[400px] mx-auto">
      <img
        // src={data?.images[0] ? data?.images[0] : data?.images}
        src={data?.images[0] || data?.images[0]}
        alt=""
        className="w-full object-cover"
      />
    </div>
  );
}
