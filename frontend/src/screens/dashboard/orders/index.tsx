import { GoPlus } from "react-icons/go";
export default function Orders() {
  return (
    <>
      <div className="w-full lg:w-[90%] max-w-custom_dashboard p-4 py-8 lg:p-12 mx-auto">
        <div className="w-full flex flex-col gap-8">
          <div className="w-full flex items-center justify-between gap-4">
            <h4 className="text-2xl lg:text-3xl font-dashboard_regular flex-1">
            Orders
              <span className="block text-sm w font-selleasy_normal leading-[1.4] text-[#64645f] max-w-[450px]">
                Make changes to your profile and to the entire app Enable
                dropdown and tab-complete suggestions while typing a query
              </span>
            </h4>
            <div className="flex items-center justify-end">
              <button
                style={{ transition: "all .2s" }}
                className="bg-[var(--dark-1)] flex items-center gap-2 rounded-xl hover:scale-[0.9] text-white text-sm p-3 px-4 font-dashboard_regular"
              >
                <GoPlus fontSize={"24px"} /> Add Orders
              </button>
            </div>
          </div>

          <div className="w-full min-h-[250px] items-center justify-center p-4  p-8 bg-[#F3F3EE] rounded-lg flex flex-col">
            <div className="w-full flex flex-col items-center justify-center  gap-4">
              <h5 className="text-base lg:text-lg text-center font-dashboard_regular flex-1">
                No Orders Listings
                <span className="block text-xs font-selleasy_normal leading-[1.4] text-[#64645f] max-w-[450px]">
                  Make changes to your profile and to the entire app Enable
                  dropdown and tab-complete suggestions while typing a query
                </span>
              </h5>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
