import NavbarWeb from "../ui/navbarWeb";
import HeroSection from "./heroSection";
import OverviewSection from "./OverviewSection";

const MainWebsite = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar - Fixed at top */}
      <NavbarWeb />
      <HeroSection />
      <OverviewSection />
      {/* <StatsSection />
      <FeaturesSection /> */}
    </div>
  );
};

export default MainWebsite;
