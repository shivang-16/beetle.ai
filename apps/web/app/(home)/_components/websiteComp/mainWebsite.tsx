import FooterSection from "../ui/footer";
import NavbarWeb from "../ui/navbarWeb";
import ParallaxBeetle from "../ui/parallax-beetle";
import FeaturesSection from "./FeaturesSection";
import HeroSection from "./heroSection";
import IntegratedModels from "./IntegratedModels";
import OverviewSection from "./OverviewSection";

const MainWebsite = () => {
  return (
    
    <main className="min-h-screen bg-[#010010] px-2 sm:px-5">
      {/* Navbar - Fixed at top */}
      <NavbarWeb />
      <HeroSection />
      <OverviewSection />
      <FeaturesSection />
      <IntegratedModels />
      <FooterSection />
      <ParallaxBeetle />
    </main>
  );
};

export default MainWebsite;
