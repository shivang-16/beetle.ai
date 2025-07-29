import Image from "next/image";
import NavbarWeb from "../ui/navbarWeb";
import HeroSection from "./heroSection";
import StatsSection from "./StatsSection";
import FeaturesSection from "./FeaturesSection";


const MainWebsite = () => {
  return (
    <div className="min-h-screen main-website-bg bg-[#17171D]">
      {/* Navbar - Fixed at top */}
      <NavbarWeb />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
    </div>
  );
};

export default MainWebsite;