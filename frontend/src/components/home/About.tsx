import AnimateTextWord from "@/components/common/AnimateTextWord";
import { Link } from "react-router-dom";
import React from "react";

const About = () => {
  return (
    <div className="w-full py-24">
      <div className="w-full bg-[var(--dark-1)] lg:min-h-[800px] py-20 pb-36 flex items-center justify-center">
        <div className="max-w-custom mx-auto flex lg:items-center lg:justify-center flex-col gap-8">
          <h2 className="text-3xl lg:text-[50px] max-w-[1000px] lg:mx-auto lg:text-center text-white font-normal leading-[60px]">
            <span className="block text-base pb-8 uppercase">
              WHAT WE DO AT SELLEASI
            </span>
            <AnimateTextWord type="bigtext_Center">
              We help you build outstanding experiences for your store. Selleasi
              is a builder that turns your frontend into a conversion machine
            </AnimateTextWord>
          </h2>
        </div>
      </div>

      <div className="max-w-custom md:-mt-32 mx-auto items-start grid lg:grid-cols-3 gap-12">
        <div className="w-full relative min-h-[450px] lg:min-h-[550px] bg-[#8f9b9d] py-4 justify-between rounded-lg flex flex-col gap-4">
          <div className="bg-white w-[100%] p-4 rounded-md" />
          <div className="relative w-[100%]">
            <img
              src="https://www.nextstore.com/_next/image?url=%2Fnext_banner.png&w=2048&q=75"
              alt=""
              className="w-full"
            />
          </div>
          <div className="min-h-[170px] bg-white w-[90%] mx-auto p-4 rounded-md">
            <span className="font-medium text-base">
              Create a unique experience for each device
            </span>
            <p className="text-sm text-[#64645f] mt-1">
              A dedicated frontend for your mobile shop and another for desktop,
              enabling a mobile-first approach. The traditional responsive
              approach simply does not make the cut anymore.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full py-20 min-h-[100px] flex items-center justify-center lg:mt-32 relative">
        <div className="absolute z-10 w-[100%] h-full">
          <img
            src="https://www.nextstore.com/_next/image?url=%2Fnext_banner.png&w=2048&q=75"
            alt=""
            className="w-full h-full"
          />
        </div>
        <div className="max-w-custom z-20 relative mx-auto flex lg:items-center lg:justify-center flex-col gap-8">
          <h2 className="text-3xl lg:text-[50px] max-w-[1000px] lg:mx-auto lg:text-center text-dark font-normal leading-[60px]">
            <span className="block text-xs pb-2 uppercase">
              NOW IT'S YOUR TURN
            </span>
            <AnimateTextWord type="bigtext_Center">
              Take your store to the next level
            </AnimateTextWord>
          </h2>
          <Link to="/onboarding" className="btn btn_2">
            <span className="p-1">Proceed to Start Building</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;