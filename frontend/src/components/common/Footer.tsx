import React from "react";
import AnimateTextWord from "@/components/common/AnimateTextWord";
import Logo from "@/assets/svg/logo";

const Footer = () => {
  return (
    <div className="relative w-full pb-8 py-4">
      <div className="h-full max-w-custom md:w-[90%] relative rounded-b-[100px] min-h-[600px] rounded-t-xl mx-auto px-4 pb-8 flex flex-col gap-8 items-center justify-end w-full bg-[#F4F3EE]">
        <div className="w-[300px] h-24 rounded-3xl bg-white absolute -top-14"></div>
        <div className="w-full px-4 flex flex-col lg:items-center lg:justify-center gap-12 lg:gap-20">
          <h2 className="text-3xl lg:text-[55px] max-w-[800px] lg:mx-auto lg:text-center text-dark font-selleasy_normal leading-[60px]">
            <span className="block text-base pb-8 font-selleasy_normal uppercase">
              {/* <AnimateTextWord type="bigtext_Center">
                WHAT WE DO AT NEXTSTORE
              </AnimateTextWord> */}
              WHAT WE DO AT NEXTSTORE
            </span>
            <AnimateTextWord type="bigtext_Center">
              Get in touch & take your store to the next-level
            </AnimateTextWord>
          </h2>
          <div className="w-full rounded-full relative h-[140px] bg-[var(--dark-1)] flex items-center justify-center">
            <div className="absolute w-full p-2 h-full top-0 left-0">
              <div className="w-40 cursor-pointer h-full p-3 bg-white rounded-full flex items-center justify-center">
                <Logo />
              </div>
            </div>
            <h2 className="text-3xl lg:text-5xl text-white font-selleasy_normal leading-[60px]">
              Build your next shop
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Footer;
