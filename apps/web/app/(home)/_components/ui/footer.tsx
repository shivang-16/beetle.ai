import Link from "next/link";
import ParallaxBeetle from "./parallax-beetle";

const links = [
  {
    title: "Pricing",
    href: "/pricing",
  },
];

export default function FooterSection() {
  return (
    <footer className="relative mb-[10rem] sm:mb-[14rem] md:mb-[20rem] lg:mb-[22rem] xl:mb-[24rem] xxl:mb-[26rem]">
      <div className="mx-auto max-w-[1563px] w-full md:p-14 p-6 md:border-l md:border-r border-[#333333]">
        <div className="flex flex-wrap justify-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-neutral-400 text-sm hover:text-neutral-200 transition-colors duration-300"
            >
              {link.title}
            </Link>
          ))}
          <span className="text-neutral-400 order-last block text-center text-sm md:order-first">
            © {new Date().getFullYear()} BEETLE, All rights reserved
          </span>
        </div>
      </div>
    
    </footer>
  );
}
