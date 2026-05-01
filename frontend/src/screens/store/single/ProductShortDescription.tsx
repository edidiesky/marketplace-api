import { TiSocialFacebook } from "react-icons/ti";
import { FaXTwitter } from "react-icons/fa6";
import { FaInstagram } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa";
import { Link } from "react-router-dom";
import ReactHtmlParser from "react-html-parser";
import sanitizeHtml from "sanitize-html";
import { LuPlus, LuMinus } from "react-icons/lu";
export default function ProductShortDescription({
  data,
}: {
  data: {
    name: string;
    description: string;
    price: number;
    size?: [{ name: string; value: string }];
    colors?: [{ name: string; value: string }];
    category?: string[];
  };
}) {
  // const colorList = ["#FBAC07", "#FF2F36", "#DF565C", "#FF6C4A"];

  // const sizeList = ["L", "XL", "M", "S"];

  const sanitizedValue = sanitizeHtml(data?.description, {
        allowedTags: ["p", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2"],
        allowedAttributes: {
          a: ["href"],
        },
        disallowedTagsMode: "discard",
      });
  return (
    <div className="w-full">
      <div className="w-full flex flex-col gap-1">
        <div className="w-full flex flex-col gap-2  border-b py-4 border-dotted">
          <h3 className="text-3xl">{data?.name}</h3>
          <h5 className="text-base space-y-2 font-k_font">
            <span className="block">SKU 028 
              {/* {data?.brand} */}
            </span>
            <span className="block">Be the first to leave a review.</span>
          </h5>
          <h3 className="text-3xl lg:text-4xl font-work_font font-bold">${data?.price}</h3>
        </div>

        <div className="w-full flex flex-col gap-6  border-b py-4 border-dotted">
          {/* timer */}
          <div className="w-full bg-[#FFCE78] p-6 flex flex-col items-center gap-3">
            <span className="text-base font-work_font font-semibold">
              Flash Sale
            </span>
            <div className="flex items-center gap-4">
              {/* Days */}
              <span className="text-base font-work_font">0 0 Days</span>
              <span className="text-base font-work_font">0 0 HRS</span>
              <span className="text-base font-work_font">0 0 Min</span>
              <span className="text-base font-work_font">0 0 Sec</span>
            </div>
          </div>

          {/* color */}
          <div className="w-full flex items-center gap-8">
            <h3 className="text-lg font-work_font font-normal">Color</h3>
            <div className="flex items-center  gap-4">
              {data?.colors?.map((data, index) => {
                return (
                  <div className="w-14 cursor-pointer hover:bg-[#eee] h-14 rounded-full p-1 border">
                    <div
                      style={{
                        background: `${data?.value}`,
                      }}
                      className="w-full h-full rounded-full"
                    ></div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* size */}
          <div className="w-full flex items-center gap-8">
            <h3 className="text-lg font-work_font font-normal">Size</h3>
            <div className="flex items-center  gap-4">
              {data?.size?.map((data, index) => {
                return (
                  <div
                    key={index}
                    className="w-16 cursor-pointer hover:bg-[#eee] font-work_font flex items-center justify-center h-12 rounded-md text-base p-1 border"
                  >
                    {data?.value}
                  </div>
                );
              })}
            </div>
          </div>

          {/* cart button */}
          <div className="w-full py-3 flex items-center gap-4">
            <div className="w-[180px] h-[45px] flex items-center font-work_font border rounded-full overflow-hidden">
              <div className="w-[50px] border-r h-full flex items-center justify-center text-sm">
                <LuPlus />
              </div>
              <div className="flex-1 h-full flex items-center justify-center text-base">
                1
              </div>
              <div className="w-[50px] border-l h-full flex items-center justify-center text-sm">
                <LuMinus />
              </div>
            </div>
            <div className="btn btn_small flex-1 text-base font-work_font text-white">
              <span className="p-1">Add to Cart</span>
            </div>
          </div>
        </div>
        {/* description */}
        <div className="w-full flex flex-col gap-2  border-b py-4 border-dotted">
          <p className="text-base font-k_font">
           {ReactHtmlParser(sanitizedValue)}
          </p>
          <div className="flex items-center justify-end">
            <Link
              to={"cart/36364374"}
              className="p-3 rounded-full text-xl hover:bg-[#fafafa]"
            >
              <TiSocialFacebook />
            </Link>
            <Link
              to={"cart/36364374"}
              className="p-3 rounded-full text-lg  hover:bg-[#fafafa]"
            >
              <FaXTwitter />
            </Link>
            <Link
              to={"cart/36364374"}
              className="p-3 rounded-full text-lg  hover:bg-[#fafafa]"
            >
              <FaInstagram />
            </Link>
            <Link
              to={"cart/36364374"}
              className="p-3 rounded-full text-lg  hover:bg-[#fafafa]"
            >
              <FaYoutube />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
