import React from "react";
import { ThreeDots } from "react-loader-spinner";
// import {
//   FadeLoader
// } from "react-spinners";
const Loader = ({ type, color }: { type?: string, color?: string }) => {
  if (type === "dots") {
    return (
  

      <ThreeDots
        height="20"
        width="20"
        radius="10"
        color={color ? color:"#fff"}
        ariaLabel="three-dots-loading"
        wrapperStyle={{}}
        visible={true}
      />
    );
  }
  return (
    <div
      className="flex items-center top-0 left-0 z-[10000000] justify-center"
      style={{
        width: "100vw",
        position: "fixed",
        height: "100vh",
        background: "#ffffffc3",
      }}
    >
      {/* <div className="w-4"></div> */}
      {/* <FadeLoader
        color={color ? color : "#000"} loading={loading} /> */}
      <ThreeDots
        height="70"
        width="70"
        radius="10"
        color={color ? color:"#000"}
        ariaLabel="three-dots-loading"
        visible={true}
      />
    </div>
  );
};

export default Loader;
