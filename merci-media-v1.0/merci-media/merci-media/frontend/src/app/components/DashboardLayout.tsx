import { Outlet, NavLink } from "react-router";
import { Search, Video, Film, List, Download, Music, User } from "lucide-react";

export function DashboardLayout() {
  const navItems = [
    { to: "/", icon: Search, label: "Recherche", end: true },
    { to: "/video", icon: Video, label: "Vidéo" },
    { to: "/films", icon: Film, label: "The Good Place" },
    { to: "/queue", icon: List, label: "File d'attente" },
    { to: "/downloads", icon: Download, label: "Téléchargements" },
    { to: "/profile", icon: User, label: "Profil" },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0a0a12]/60 backdrop-blur-xl border-r border-gray-800/50 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">
                Merci
              </h1>
              <p className="text-[10px] text-gray-500">Media Downloader</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2.5 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600/20 border border-blue-600/40"
                    : "hover:bg-white/5 hover:border hover:border-gray-700"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-3.5 h-3.5 ${
                      isActive
                        ? "text-blue-400"
                        : "text-gray-400"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      isActive
                        ? "text-blue-400 font-medium"
                        : "text-gray-300"
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-2.5 border-t border-gray-800/50">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/30 border border-gray-700/30">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[10px] font-semibold">
              AD
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-white">admin</p>
              <p className="text-[10px] text-gray-500">Connecté</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}