"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { ReactNode, MouseEvent } from "react"

interface TransitionLinkProps {
  href: string
  children: ReactNode
  className?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

const TransitionLink = ({ href, children, className, onMouseEnter, onMouseLeave }: TransitionLinkProps) => {
  const router = useRouter()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (href.startsWith("http")) {
      return
    }

    e.preventDefault()

    const wrapper = document.querySelector('.transition-wrapper')
    
    if (wrapper) {
      wrapper.classList.add('page-transition')
      
      setTimeout(() => {
        router.push(href)
      }, 150)
    } else {
      router.push(href)
    }
  }

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </Link>
  )
}

export default TransitionLink