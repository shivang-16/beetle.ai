import Link from "next/link";

const links = [
  {
    title: "Pricing",
    href: "/pricing",
  },
];

export default function FooterSection() {
  return (
    <footer className="px-5">
      <div className="mx-auto max-w-[1563px] w-full md:p-14 p-6 border border-t-0 border-b-0 border-[#333333]">
        <div className="flex flex-wrap justify-center gap-6">
          <span className="text-neutral-400 order-last block text-center text-sm md:order-first">
            © {new Date().getFullYear()} Codetector, All rights reserved
          </span>
        </div>
      </div>
    </footer>
  );
}
