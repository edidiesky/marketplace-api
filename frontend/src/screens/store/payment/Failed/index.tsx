
import { useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function PaymentFailed() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-black/5 p-10 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <XCircle size={32} className="text-red-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-[#171717]">Payment Failed</h1>
          <p className="text-sm text-[#666] mt-2 leading-relaxed">
            Something went wrong with your payment. Your cart has been saved and you can try again.
          </p>
        </div>

        <div className="w-full bg-[#f4f3ee] p-4 text-left flex flex-col gap-1">
          <p className="text-xs text-[#888] uppercase tracking-wide font-medium">What to do next</p>
          <p className="text-sm text-[#666] mt-1">Check your card details and try again, or switch to a different payment method.</p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => navigate(-2 as unknown as string)}
            className="w-full h-12 bg-[#171717] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full h-12 border border-black/10 text-sm font-medium hover:bg-[#f4f3ee] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}