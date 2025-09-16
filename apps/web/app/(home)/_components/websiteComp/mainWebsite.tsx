import FooterSection from "../ui/footer";
import NavbarWeb from "../ui/navbarWeb";
import FeaturesSection from "./FeaturesSection";
import HeroSection from "./heroSection";
import IntegratedModels from "./IntegratedModels";
import OverviewSection from "./OverviewSection";

const MainWebsite = () => {
  return (
    <main className="min-h-screen bg-[#010010]">
      {/* Navbar - Fixed at top */}
      <NavbarWeb />
      <HeroSection />
      <OverviewSection />
      <FeaturesSection />
      <IntegratedModels />
      <FooterSection />
    </main>
  );
};

export default MainWebsite;
