import {
  useEffect,
  useState,
} from "react"

import {
  Outlet,
  useLocation,
} from "react-router-dom"

import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"

export function AppLayout() {
  const location =
    useLocation()

  const [
    mobileSidebarOpen,
    setMobileSidebarOpen,
  ] =
    useState(false)

  useEffect(() => {
    setMobileSidebarOpen(
      false,
    )
  }, [
    location.pathname,
  ])

  useEffect(() => {
    if (
      !mobileSidebarOpen
    ) {
      return
    }

    const previousOverflow =
      document.body.style
        .overflow

    document.body.style.overflow =
      "hidden"

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [
    mobileSidebarOpen,
  ])

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
          "Escape" &&
        mobileSidebarOpen
      ) {
        setMobileSidebarOpen(
          false,
        )
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    )

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      )
    }
  }, [
    mobileSidebarOpen,
  ])

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <AppSidebar
        mobileOpen={
          mobileSidebarOpen
        }
        onMobileClose={() =>
          setMobileSidebarOpen(
            false,
          )
        }
      />

      <main className="min-w-0 lg:pl-[260px]">
        <AppHeader
          onMenuClick={() =>
            setMobileSidebarOpen(
              true,
            )
          }
        />

        <div className="min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}