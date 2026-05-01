import AnimateTextWord from "@/components/common/AnimateTextWord";

import React from "react";

const Newsletter = () => {
  return (
    <div className="flex w-full bg-[#151402]  py-20 items-center gap-8 justify-center">
      <div className="max-w-custom w-full">
        <div className="w-full flex flex-col gap-8">
          <h2 className="text-4xl flex-1 md:text-5xl font-bold lg:text-7xl max-w-[750px] text-start leading-[1] family2 text-white family2">
            <AnimateTextWord type="bigtext">
              Spend your money and manage your finances stress-free
            </AnimateTextWord>
          </h2>
          <div className="flex flex-1 flex-col gap-4">
            <span className="text-base lg:text-lg text-[var(--grey-1)] font-normal max-w-[500px]">
              <AnimateTextWord>
                See what everyone is talking about! Download Expense AI and
                discover the easiest way to track your expenses.
              </AnimateTextWord>
            </span>
          </div>
          <span className="">
            <button className="btn btn_2">
              <span className="p-3">Start A Shop</span>
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Newsletter;
