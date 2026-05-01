"use client";
import { ThreeDots } from "react-loader-spinner";
const Loader = ({
  type,
  color,
  size,
  title,
}: {
  type?: string;
  title?: string;
  color?: string;
  size?: string;
}) => {
  if (type === "dots") {
    return (
      <ThreeDots
        height={size ? size : "18"}
        width={size ? size : "18"}
        radius="10"
        color={color ? color : "#fff"}
        ariaLabel="three-dots-loading"
        wrapperStyle={{}}
        // wrapperClassName=""
        visible={true}
      />
    );
  }
  return (
    <div
      className="flex items-center top-0 text-2xl text-dark left-0 z-[333330000000] justify-center flex-col gap-3"
      style={{
        width: "100vw",
        position: "fixed",
        height: "100vh",
        background: "#ffffffdd",
      }}
    >
      <ThreeDots
        height="40"
        width="40"
        radius="10"
        color={"#000"}
        ariaLabel="three-dots-loading"
        wrapperStyle={{}}
        // wrapperClassName=""
        visible={true}
      />
      {title}
    </div>
  );
};

export default Loader;
