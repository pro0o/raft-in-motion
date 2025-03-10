import Link from "next/link"

export default function Footer() {
  const links = [
    { href: "https://github.com", label: "github" },
    { href: "https://twitter.com", label: "twitter" },
    { href: "/profile", label: "profile" }
  ]

  return (
    <footer className="w-full py-4">
      <div className="container mx-auto px-4">
        <div className="flex justify-center items-center gap-8">
          {links.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              className="font-mono text-md lowercase text-zinc-800 underline font-semibold"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
