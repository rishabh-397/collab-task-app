// components/Header.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { UserCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    loadUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="flex justify-between items-center p-4 gap-6 bg-background/80 backdrop-blur-sm border-b sticky top-0 z-50">
      <h1 className="text-xl font-bold">Collab Task</h1>

      <div className="flex items-center gap-4">
        <ThemeSwitcher />

        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <UserCircle className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium hidden md:inline">
                {user.email?.split('@')[0] || "User"}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
            Login
          </Button>
        )}
      </div>
    </header>
  );
}