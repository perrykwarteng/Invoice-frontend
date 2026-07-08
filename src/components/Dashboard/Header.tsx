"use client";

import { useGreeting } from "@/hooks/greetHook";
import { useUserStore } from "@/store/useUserStore";
import { Bell, Menu, User } from "lucide-react";

interface HeaderProps {
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Header({ setMobileOpen }: HeaderProps) {
  const { userInfo } = useUserStore();
  const greeting = useGreeting();

  return (
    <header className="bg-white px-4 md:px-6 border-b border-gray-200 h-20">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6 text-accent" />
          </button>

          <div>
            <p className="text-sm text-gray-500 font-medium">{greeting}</p>
            <h2 className="text-xl md:text-2xl font-semibold text-accent">
              {userInfo.user.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition">
            <Bell className="w-5 h-5 text-accent" />
          </button>

          <div className="flex items-center gap-3 bg-gray-50 px-3 py-1 rounded-xl border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <User className="w-5 h-5 text-accent" />
            </div>

            <div className="hidden md:block">
              <h4 className="text-accent text-sm uppercase font-semibold">
                {userInfo.org.orgName}
              </h4>
              <p className="text-sm text-gray-500">{userInfo.user.email}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
