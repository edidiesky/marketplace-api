import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import Loader from "@/components/loader";
// import { UpdatePaymentToDelivered } from "@/features/payment/paymentReducer";
export default function PaymentPlaceholder({ type }: { type?: string }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  let cart: { totalPrice: 0 }[] = [];
  // const { cart } = useSelector((store: any) => store.cart);
  let payments: {
    deliverystatus: string;
    salesamount: 0;
    amount: 0;
    createdAt: string;
  }[] = [];

  let updatepaymentToDeliveredisSuccess = false;
  let updatepaymentToDeliveredisLoading = false;
  // const {
  //   payment,
  //   payments,
  //   updatepaymentisLoading,
  //   updatepaymentToDeliveredisSuccess,
  //   updatepaymentToDeliveredisLoading,
  // } = useSelector((store: any) => store.payment);
  const { shippingInformation, currentUser } = useSelector(
    (store: any) => store.auth
  );
  // console.log(shippingInformation);
  const { totalShoppingPrice } = cart?.reduce(
    (acc: { totalShoppingPrice: any }, total: { totalPrice: any }) => {
      const totalPrice = total?.totalPrice;
      acc.totalShoppingPrice += totalPrice;
      return acc;
    },
    { totalShoppingPrice: 0 }
  );
  // console.log(totalShoppingPrice);
  const tax = totalShoppingPrice + 20;
  const totalPrice = tax + totalShoppingPrice;

  // payment summary

  const { totalSalesAmount, totalAmount } = payments.reduce(
    (
      acc: { totalSalesAmount: any; totalAmount: any },
      total: { salesamount: any; amount: any }
    ) => {
      acc.totalSalesAmount += total?.salesamount;
      acc.totalAmount += total?.amount;
      return acc;
    },
    { totalSalesAmount: 0, totalAmount: 0 }
  );

  useEffect(() => {
    if (updatepaymentToDeliveredisSuccess) {
      const timer = setTimeout(() => {
        navigate(`/dashboard/orders`);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [updatepaymentToDeliveredisSuccess, navigate]);
  // console.log(totalSalesAmount);
  // UpdatePaymentToDelivered
  // if (type === "code") {
  //   return (
  //     <CartHolderContainer>
  //       <h3 className="font-work_font uppercase">Have A Promotional Code?</h3>
  //       <div className="w-full flex gap-2">
  //         <input type="text" className="input flex-1" />
  //         <div className="uppercase flex-1">
  //           <div className="font-work_font font-normal uppercase btn text-dark text-base">
  //             Apply Coupon
  //           </div>
  //         </div>
  //       </div>
  //     </CartHolderContainer>
  //   );
  // }
  if (type === "payment") {
    return (
      <div className="relative">
        <img
          src="https://avada.website/restaurant/wp-content/uploads/sites/112/2020/04/slider72x-scaled.jpg"
          alt=""
          className="w-full h-full z-10 absolute left-0 top-0 object-cover"
        />
        <div className="gradient2 absolute top-0 left-0 h-full w-full z-20"></div>
        <div className="w-full z-[400] flex flex-col gap-12">
          <div className="w-full z-[400] text-[#fff] flex flex-col gap-4">
            <h3 className="font-work_font text-3xl md:text-4xl text-[#fff] z-30 uppercase">
              Payment Summary
            </h3>
            <div className="w-full flex flex-col gap-6">
              <h4 className="font-work_font text-base">
                Subtotal{" "}
                <span className=" font-work_font font-normal  text-base">
                  ₦{totalAmount}
                </span>
              </h4>
              <h4 className="font-work_font text-base flex items-center justify-between">
                Shipping{" "}
                <span className=" font-work_font font-normal  text-end text-base span1">
                  <span className="block font-work_font font-semibold pb-3">
                    Flat rate: <br />{" "}
                    <span className="pt-2">
                      ₦{totalSalesAmount - totalAmount}
                    </span>
                  </span>
                  {shippingInformation === null ? (
                    <span className="text-end">No Shipping destination</span>
                  ) : (
                    <span className="text-end space-x-2">
                      Shipping to <br />{" "}
                      <span className=" text-bold">
                        {shippingInformation?.city?.name},
                      </span>
                      <span className=" text-bold">
                        {shippingInformation?.state?.name}
                      </span>
                      <span className=" text-bold">
                        {shippingInformation?.country?.name}
                      </span>
                    </span>
                  )}
                </span>
              </h4>
              <h4 className="font-work_font text-base flex items-center justify-between">
                Date Created{" "}
                <span className=" font-work_font font-normal  text-end text-base span1">
                  {moment(payments[0]?.createdAt).format("DD MMM YYYY")}
                </span>
              </h4>
              <h4 className="font-work_font text-base flex items-center justify-between">
                Total Payment{" "}
                <span className=" font-work_font font-normal text-base span1">
                  ₦{totalSalesAmount}
                </span>
              </h4>

              <h4 className="font-work_font text-base flex items-center justify-between">
                Order Status{" "}
                {payments[0]?.deliverystatus === "DELIVERED" ? (
                  <span className=" font-work_font font-normal text-base span1">
                    Delivered
                  </span>
                ) : (
                  <span className=" font-work_font font-normal text-base span1">
                    Not Delivered
                  </span>
                )}
              </h4>
            </div>
          </div>
          {payments[0]?.deliverystatus !== "DELIVERED" && (
            <div className="uppercase flex flex-col gap-4">
              {currentUser?.role === "SELLER" ||
                (currentUser?.role === "ADMIN" && (
                  <span
                    onClick={
                      () => {}
                      // dispatch(
                      //   UpdatePaymentToDelivered(payments[0]?.paymentGroupId)
                      // )
                    }
                    className="btn text-sm font-work_font btn_small"
                  >
                    {updatepaymentToDeliveredisLoading ? (
                      <div className="full p-1 flex items-center justify-center gap-3">
                        Updating <Loader type={"dots"} />
                      </div>
                    ) : (
                      <>
                        <div className="full p-1 flex items-center justify-center gap-3">
                          Update Order To Delivered
                        </div>
                      </>
                    )}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="relative w-full p-8 bg-[#2B2E32]">
      <div className="w-full z-[400] flex flex-col gap-12">
        <div className="w-full z-[400] text-[#fff] flex flex-col gap-4">
          <h3 className="font-work_font text-lg md:text-xl text-[#fff] z-30">
            Cart totals
          </h3>
          <div className="w-full flex flex-col gap-4">
            <h4 className="font-work_font text-base flex items-center justify-between">
              Subtotal{" "}
              <span className=" font-work_font font-normal  text-base">
                ₦{totalShoppingPrice}
              </span>
            </h4>
            <h4 className="font-work_font text-base flex items-center justify-between">
              Shipping{" "}
              <span className=" font-work_font font-normal  text-end text-base span1">
                <span className="block font-work_font font-semibold pb-3">
                  Flat rate: <br />{" "}
                  <span className="pt-2">
                    ₦{totalSalesAmount - totalAmount}
                  </span>
                </span>
                {shippingInformation === null ? (
                  <span className="text-end">No Shipping destination</span>
                ) : (
                  <span className="text-end space-x-2">
                    Shipping to <br />{" "}
                    <span className=" text-bold">
                      {shippingInformation?.city?.name},
                    </span>
                    <span className=" text-bold">
                      {shippingInformation?.state?.name}
                    </span>
                    <span className=" text-bold">
                      {shippingInformation?.country?.name}
                    </span>
                  </span>
                )}
              </span>
            </h4>
            <h4 className="font-work_font text-base flex items-center justify-between">
              Total{" "}
              <span className=" font-work_font font-normal text-base span1">
                ₦{totalPrice}
              </span>
            </h4>
          </div>
        </div>
        <div className="uppercase flex flex-col gap-4">
          {/* <FlutterPaymentButton totalPrice={totalPrice} /> */}
          <button className="btn btn_small_2">
            <span className="p-1 font-work_font">Proceed to Checkout</span>
          </button>
          <button className="btn btn_small_3">
            <span className="p-1 font-work_font">Update Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}

