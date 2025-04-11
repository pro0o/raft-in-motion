import Link from "next/link"
import { useMediaQuery } from "@/context/mediaQuery"

export default function Footer() {
  const isMobile = useMediaQuery("(max-width: 640px)")

  const links = [
    { href: "/", label: "[/home]" },
    { href: "/", label: "[this simulation was done using golang]" },
    { href: "https://github.com/pro0o/raft-in-motion/", label: "[github]" },
  ]

  return (
    <footer className="w-full py-2 sm:py-3 md:py-4">
      <div className="container mx-auto px-2 sm:px-4">
        <div
          className={`flex ${isMobile ? "flex-col" : "flex-row"} justify-center items-center ${isMobile ? "gap-1" : "gap-2 sm:gap-3 md:gap-6"}`}
        >
          {links.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className="font-medium lowercase text-xs sm:text-sm md:text-base text-zinc-700 tracking-wider hover:bg-blue-500 hover:text-white transition-colors px-1 rounded-sm duration-100 text-center"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
