import AnimateTextWord from "@/components/common/AnimateTextWord";

const topIdeasData = [
  {
    title: "Snap or Forward",
    description:
      "Simply take a photo of your receipt with your phone or forward it directly to your Expense AI email address.",
    image: "https://expenseai.app/_next/static/media/snap.e8af93f7.svg",
  },
  {
    title: "AI Extraction",
    description:
      "Our AI engine instantly extracts key information from your receipt, including the amount, merchant, date, and even product details.",
    image: "https://expenseai.app/_next/static/media/ai.e5700d21.svg",
  },
  {
    title: "Chat with your expense data",
    description:
      "Gain valuable insights and patterns on your expenses with our AI to make more informed financial decisions.",
    image: "https://expenseai.app/_next/static/media/chat.a24f70cf.svg",
  },
  {
    title: "All your analytics in one dashboard",
    description:
      "Access detailed reports and charts to visualize your expenses, helping you gain valuable insights into your financial behavior.",
    image: "https://expenseai.app/_next/static/media/dashboard.769a91c7.svg",
  },
];

const FAQ = () => {
  return (
    <div className="flex w-full py-32 bg-white flex-col gap-32">
      <div className="max-w-custom mx-auto w-[90%] flex flex-col gap-12 md:gap-20">
        <h2 className="text-3xl lg:text-5xl lg:pt-6 flex flex-col lg:justify-center lg:items-center w-full leading-[1.6] capitalize text-dark ">
          <span className="font-semibold lg:text-center">
            <AnimateTextWord>Frequently asked questions</AnimateTextWord>
          </span>

          <span className="text-lg text-[var(--dark-grey)] max-w-[750px] lg:text-center pt-3 block">
            Stay in complete control. Maintain complete visibility over your
            queue, configure granular SLAs and notifications, and bring your
            support and pricing structure to Plain.
          </span>
        </h2>
        <div className="w-full grid md:grid-cols-2 gap-8">
          {/* {topIdeasData?.map((data, index) => {
            return (
              <div
                key={index}
                className="w-full p-8 py-12 border min-h-[600px] flex justify-between flex-col gap-8 bg-[#F6F5F1] rounded-[40px]"
              >
                <div className="w-full flex flex-col gap-1">
                  <h3 className="text-3xl font-semibold">{data?.title}</h3>
                  <p className="text-base text-[var(--dark-grey)] font-normal">
                    {data?.description}
                  </p>
                </div>
                <div className="w-full">
                  <img
                    src={data?.image}
                    alt=""
                    className="w-full object-cover"
                  />
                </div>
              </div>
            );
          })} */}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
