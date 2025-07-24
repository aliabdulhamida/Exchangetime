"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { Bell, ChevronRight } from "lucide-react"
import Profile01 from "./profile-01"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ThemeToggle } from "../theme-toggle"

const FearGreedIndex = dynamic(() => import("@/components/stock-market/fear-greed-index"), { ssr: false })

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function TopNav() {
  return (
    <nav className="px-3 sm:px-6 flex items-center justify-end bg-white dark:bg-[#0F0F12] border-b border-gray-200 dark:border-[#1F1F23] h-full">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Fear & Greed Index ganz rechts mit Label */}
        <div className="hidden md:flex items-center ml-6">
          <span className="mr-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Fear & Greed</span>
          <FearGreedIndex />
        </div>
        <ThemeToggle />
      </div>
    </nav>
  )
}
