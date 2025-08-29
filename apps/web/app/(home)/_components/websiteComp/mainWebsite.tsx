import NavbarWeb from "../ui/navbarWeb";
import HeroSection from "./heroSection";

const MainWebsite = () => {
  return (
    <div className="min-h-screen bg-[#010010]">
      {/* Navbar - Fixed at top */}
      <NavbarWeb />
      <HeroSection />
      {/* <StatsSection />
      <FeaturesSection /> */}
    </div>
  );
};

export default MainWebsite;
