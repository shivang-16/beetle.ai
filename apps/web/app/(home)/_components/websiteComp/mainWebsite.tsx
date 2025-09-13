import NavbarWeb from "../ui/navbarWeb";
import FeaturesSection from "./FeaturesSection";
import HeroSection from "./heroSection";
import OverviewSection from "./OverviewSection";

const MainWebsite = () => {
  return (
    <main className="min-h-screen bg-[#010010]">
      {/* Navbar - Fixed at top */}
      <NavbarWeb />
      <HeroSection />
      <OverviewSection />
      {/* <StatsSection />*/}
      <FeaturesSection />
    </main>
  );
};

export default MainWebsite;
