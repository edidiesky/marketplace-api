import AnimateTextWord from "@/components/common/AnimateTextWord";
// import Image from 'next/image'

import { FaStar } from "react-icons/fa";
import { ImQuotesLeft } from "react-icons/im";
import React from "react";
const Reviews = () => {
  return (
    <div className="flex w-full py-20 items-center bg-[#fff] gap-8 justify-center">
      <div className="max-w-custom mx-auto w-[90%] flex flex-col gap-12 lg:gap-24">
        {/* <h2 className="text-3xl lg:text-5xl w-full lg:mx-auto max-w-[650px] leading-[1.3] md:text-center capitalize text-dark font-bold">
                    <AnimateTextWord type='bigtext_Center'>
                        600,000 companies have already made the move
                    </AnimateTextWord>
                </h2> */}
        <h2 className="text-3xl lg:text-5xl w-full max-w-[750px] leading-[1.6] capitalize text-dark ">
          <span className="font-bold">
            <AnimateTextWord>
              600,000 companies have already made the move
            </AnimateTextWord>
          </span>

          <span className="text-lg pt-3 block">
            Stay in complete control. Maintain complete visibility over your
            queue, configure granular SLAs and notifications, and bring your
            support and pricing structure to Plain.
          </span>
        </h2>
        <div className="w-full grid md:grid-cols-3 gap-8">
          <div className="w-full flex flex-col gap-6">
            <div className="w-full h-[450px] rounded-2xl overflow-hidden flex items-center justify-center relative">
              <img
                //
                alt={"Photoimg Description"}
                src={
                  "https://i.vimeocdn.com/video/1949860608-9bc6cb43c39893f3484f819cf94ea5f0454b2984b759ddc379fa07301cc6fc9a-d?mw=1500&q=85"
                }
                className="w-full object-cover absolute z-[20] top-0 left-0 h-full"
              />
              <div className="w-20 h-20 hover:scale-105 cursor-pointer relative z-[50]">
                <img
                  //
                  alt={"Photoimg Description"}
                  src={
                    "https://crisp.chat/_ipx/s_16x16/components/common/CommonCardTestimonialVideo/play.svg"
                  }
                  className="w-full object-cover"
                />
              </div>
            </div>
            <div className="p-6 border rounded-xl flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-3xl">
                  <FaStar color="#ffbf0f" />
                </span>
                <span className="text-3xl">
                  <FaStar color="#ffbf0f" />
                </span>
                <span className="text-3xl">
                  <FaStar color="#ffbf0f" />
                </span>
                <span className="text-3xl">
                  <FaStar color="#ffbf0f" />
                </span>
              </div>
              <h4
                style={{
                  lineHeight: "1.5",
                }}
                className="text-lg md:text-xl w-full pr-4"
              >
                We are able to measure and manage all mediums effectively and
                increase customer satisfaction and resolution time drastically
                compared to previous solutions we used like Intercom and
                Zendesk.
              </h4>
            </div>

            <div className="p-6 border rounded-xl flex flex-col gap-4">
              <div className="w-full flex items-center gap-4">
                <img
                  width={50}
                  height={50}
                  alt={"Photoimg Description"}
                  src={"/images/user_1.jpg"}
                  className="w-[50px] h-[50px] rounded-full object-cover"
                />
                <h4 className="text-base md:text-lg font-bold flex-1">
                  Carlos Costa
                  <span className="block text-sm lg:text-sm text-[#777]">
                    Foca
                  </span>
                </h4>
              </div>
              <h4 className="text-base md:text-sm w-full pr-4">
                Since we've started using Crisp, I've seen the software evolve
                nicely.
              </h4>
            </div>
          </div>
          <div className="w-full flex flex-col gap-6">
            <div className="p-6 border rounded-xl flex flex-col gap-4">
              <div className="w-full flex items-center gap-4">
                <img
                  width={50}
                  height={50}
                  alt={"Photoimg Description"}
                  src={"/images/user_2.jpg"}
                  className="w-[50px] h-[50px] rounded-full object-cover"
                />
                <h4 className="text-base md:text-lg font-bold flex-1">
                  Carlos Costa
                  <span className="block text-sm lg:text-sm text-[#777]">
                    Foca
                  </span>
                </h4>
              </div>
              <h4 className="text-base md:text-sm w-full">
                Crisp has been amazing and the first thing that really attracted
                me to, as a techy, was the size of the chat widget.
              </h4>
            </div>
            <div className="p-6 border rounded-xl flex flex-col gap-8 items-center justify-center bg-[#fcfcfd]">
              <span className="text-4xl lg:text-7xl text-[#eee]">
                <ImQuotesLeft />
              </span>
              <h4 className="text-xl italic w-full text-center">
                All is ready to use "out of the box" and Crisp support is
                stellar... We have tried many other solutions, Crisp is the only
                one that allowed us to do everything easily within the same app.
              </h4>
            </div>
            <div className="w-full h-[450px] rounded-2xl overflow-hidden flex items-center justify-center relative">
              <img
                //
                alt={"Photoimg Description"}
                src={
                  "https://i.vimeocdn.com/video/1949860608-9bc6cb43c39893f3484f819cf94ea5f0454b2984b759ddc379fa07301cc6fc9a-d?mw=1500&q=85"
                }
                className="w-full object-cover absolute z-[20] top-0 left-0 h-full"
              />
              <div className="w-20 h-20 hover:scale-105 cursor-pointer relative z-[50]">
                <img
                  //
                  alt={"Photoimg Description"}
                  src={
                    "https://crisp.chat/_ipx/s_16x16/components/common/CommonCardTestimonialVideo/play.svg"
                  }
                  className="w-full object-cover"
                />
              </div>
            </div>
          </div>
          <div className="w-full flex flex-col gap-6">
            <div className="p-6 border rounded-xl flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <img
                  width={30}
                  height={30}
                  alt={"Photoimg Description"}
                  src={"https://crisp.chat/_ipx/s_28x28/common/icons/star.svg"}
                  className=" h-[30px] w-[30px] object-cover"
                />
                <img
                  width={30}
                  height={30}
                  alt={"Photoimg Description"}
                  src={"https://crisp.chat/_ipx/s_28x28/common/icons/star.svg"}
                  className=" h-[30px] w-[30px] object-cover"
                />{" "}
                <img
                  width={30}
                  height={30}
                  alt={"Photoimg Description"}
                  src={"https://crisp.chat/_ipx/s_28x28/common/icons/star.svg"}
                  className=" h-[30px] w-[30px] object-cover"
                />{" "}
                <img
                  width={30}
                  height={30}
                  alt={"Photoimg Description"}
                  src={"https://crisp.chat/_ipx/s_28x28/common/icons/star.svg"}
                  className=" h-[30px] w-[30px] object-cover"
                />
                <img
                  width={30}
                  height={30}
                  alt={"Photoimg Description"}
                  src={"https://crisp.chat/_ipx/s_28x28/common/icons/star.svg"}
                  className=" h-[30px] w-[30px] object-cover"
                />
              </div>
              <h4
                style={{
                  lineHeight: "1.5",
                }}
                className="text-lg md:text-xl w-full pr-4"
              >
                We are able to measure and manage all mediums effectively and
                increase customer satisfaction and resolution time drastically
                compared to previous solutions we used like Intercom and
                Zendesk.
              </h4>
            </div>

            <div className="w-full h-[450px] rounded-2xl overflow-hidden flex items-center justify-center relative">
              <img
                //
                alt={"Photoimg Description"}
                src={
                  "https://i.vimeocdn.com/video/1949860608-9bc6cb43c39893f3484f819cf94ea5f0454b2984b759ddc379fa07301cc6fc9a-d?mw=1500&q=85"
                }
                className="w-full object-cover absolute z-[20] top-0 left-0 h-full"
              />
              <div className="w-20 h-20 hover:scale-105 cursor-pointer relative z-[50]">
                <img
                  //
                  alt={"Photoimg Description"}
                  src={
                    "https://crisp.chat/_ipx/s_16x16/components/common/CommonCardTestimonialVideo/play.svg"
                  }
                  className="w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
