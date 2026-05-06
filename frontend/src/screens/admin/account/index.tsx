import React from "react";
import { SlSettings } from "react-icons/sl";
import { CiCamera } from "react-icons/ci";
import { HiMiniCamera } from "react-icons/hi2";
export default function Account() {
  return (
    <>
      <div className="w-full  p-4 lg:p-12 mx-auto">
        <div className="w-full flex flex-col gap-8">
          <div className="w-full">
            <h4 className="text-3xl font-work_font font-semibold">
              Account
              <span className="block text-sm w font-work_font font-normal leading-[1.4] text-[#64645f] max-w-[450px]">
                Make changes to your profile and to the entire app Enable
                dropdown and tab-complete suggestions while typing a query
              </span>
            </h4>
          </div>
          {/* appearance and language */}
          <div className="w-full flex flex-col gap-2">
            <h5 className="text-base font-work_font font-semibold flex-1 px-2">General</h5>

            <div className="w-full p-4  p-8 bg-[#F3F3EE] rounded-lg flex flex-col">
              {/* appearance */}
              <div className="border-b py-4 w-full flex items-center justify-between gap-3">
                <h5 className="text-base font-work_font font-semibold flex-1">
                  <span> Appearance</span>
                  <span className="block text-sm font-work_font font-normal text-[#64645f]">
                    {" "}
                    How SellEasy looks on your device
                  </span>
                </h5>
                <div className="flex items-center justify-end">
                  <div
                    style={{ transition: "all .2s" }}
                    className="p-1 px-2 bg-[#E8E8E3] cursor-pointer hover:scale-[0.9] font-work_font font-semibold flex items-center gap-2 rounded-md text-[#13343b] text-base"
                  >
                    <SlSettings /> Dark
                  </div>
                </div>
              </div>
              {/* language */}
              <div className="border-b py-4 w-full flex items-center justify-between gap-3">
                <h5 className="text-base font-work_font font-semibold flex-1">
                  <span> Language</span>
                  <span className="block text-sm font-work_font font-normal text-[#64645f]">
                    {" "}
                    The language used in the user interface
                  </span>
                </h5>
              </div>
            </div>
          </div>

          {/* Account*/}
          <div className="w-full flex flex-col gap-2">
            <h5 className="text-base font-work_font font-semibold flex-1 px-2">Account</h5>

            <div className="w-full p-4  p-8 bg-[#F3F3EE] rounded-lg flex flex-col">
              {/* Avatar */}
              <div className="border-b py-4 w-full flex items-center justify-between gap-3">
                <h5 className="text-base font-work_font font-semibold flex-1 font-work_font">
                  <span> Avatar</span>
                </h5>
                <div className="flex items-center justify-end">
                  <div className="w-[70px] cursor-pointer h-[70px] relative flex bg-[#004E3F] items-center text-lg lg:text-4xl text-white justify-center rounded-full">
                    {/* {user?.name?.split("")[0]} */}E
                    <div className="w-[30px] rounded-full h-[30px] bg-[#E8E8E3] flex items-center text-lg lg:text-lg text-grey justify-center absolute -bottom-1 -right-1">
                      <HiMiniCamera />
                    </div>
                  </div>
                </div>
              </div>
              {/* Email */}
              <div className="border-b py-4 w-full flex items-center justify-between gap-3">
                <h5 className="text-base font-work_font font-semibold flex-1 font-work_font">
                  <span> Email</span>
                </h5>
                <div className="flex items-center justify-end">
                  <span className="block text-base font-dashboard_normal text-[#64645f]">
                    {" "}
                    eddyessienscript@gmail.com
                  </span>
                </div>
              </div>
              {/* Email */}
              <div className="border-b py-4 w-full flex items-center justify-between gap-3">
                <h5 className="text-base font-work_font font-semibold flex-1 font-work_font">
                  <span> Username</span>
                </h5>
                <div className="flex items-center justify-end">
                  <span className="block text-sm font-selleasy_regular text-[#64645f]">
                    {" "}
                    eddyessienscript@gmail.com
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Account*/}
          <div className="w-full flex flex-col gap-2">
            <h5 className="text-ba font-work_font font-semiboldse px-2">System </h5>

            <div className="w-full p-4  p-8 bg-[#F3F3EE] rounded-lg flex flex-col">
              {/* appearance */}
              <div className="border-b py-4 w-full flex items-center justify-between gap-3">
                <h5 className="text-base font-work_font font-semibold flex-1">
                  <span> Active account</span>
                  <span className="block text-sm font-work_font font-normal text-[#64645f]">
                    {" "}
                    You are signed in as eddyessien33951
                  </span>
                </h5>
                <div className="flex items-center justify-end">
                  <div
                    style={{ transition: "all .2s" }}
                    className="p-2 px-3 bg-[#E8E8E3] cursor-pointer hover:scale-[0.9] font-selleasy_regular flex items-center gap-2 rounded-md text-[#13343b] text-sm"
                  >
                    Sign Out
                  </div>
                </div>
              </div>
              {/* language */}
              <div className="border-b py-4 w-full flex items-center justify-between gap-3">
                <h5 className="text-base font-work_font font-semibold flex-1">
                  <span> Delete account</span>
                  <span className="block text-sm font-work_font font-normal text-[#64645f]">
                    {" "}
                    Permanently delete your account and data
                  </span>
                </h5>
                <div className="flex items-center justify-end">
                  <div
                    style={{ transition: "all .2s" }}
                    className="p-2 px-3 bg-[#E8E8E3] cursor-pointer hover:scale-[0.9] font-selleasy_regular flex items-center gap-2 rounded-md text-[#13343b] text-sm"
                  >
                    Learn More
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
