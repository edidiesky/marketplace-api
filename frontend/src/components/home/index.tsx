import Hero from "./Hero";
import Header from "../common/Header";
import Footer from "../common/Footer";
import SmoothScroll from "@/constants/SmoothScroll";
import StatsScroll from "./Stats";
import StickyFeatures from "./StickyFeatures";
const HomeIndex = () => {
  return (
    <SmoothScroll>
      <Header />
      <Hero />
      <StatsScroll />
      <StickyFeatures />
      <Footer />
    </SmoothScroll>
  );
};

export default HomeIndex;
