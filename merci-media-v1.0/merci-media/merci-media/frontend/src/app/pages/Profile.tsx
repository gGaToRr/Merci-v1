import { User, Mail, Lock, Camera, Trash2, LogOut, Database } from "lucide-react";
import { api } from "../api";

export function Profile() {
  const profileOptions = [
    {
      id: "photo",
      icon: Camera,
      label: "Changer la photo de profil",
      description: "Modifier votre image de profil",
      action: "upload",
      color: "blue",
    },
    {
      id: "username",
      icon: User,
      label: "Modifier le nom d'utilisateur",
      description: "Changer votre nom d'utilisateur",
      action: "edit",
      color: "blue",
    },
    {
      id: "email",
      icon: Mail,
      label: "Modifier l'adresse email",
      description: "Changer votre email de connexion",
      action: "edit",
      color: "blue",
    },
    {
      id: "password",
      icon: Lock,
      label: "Modifier le mot de passe",
      description: "Changer votre mot de passe",
      action: "edit",
      color: "blue",
    },
    {
      id: "cache",
      icon: Database,
      label: "Vider le cache",
      description: "Effacer les données temporaires",
      action: "clear",
      color: "yellow",
    },
    {
      id: "logout",
      icon: LogOut,
      label: "Déconnexion",
      description: "Se déconnecter du compte",
      action: "logout",
      color: "orange",
    },
    {
      id: "delete",
      icon: Trash2,
      label: "Supprimer le compte",
      description: "Supprimer définitivement votre compte",
      action: "delete",
      color: "red",
    },
  ];

  const handleAction = async (action: string) => {
    if (action === "logout") {
      try { await api.logout(); } catch {}
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.replace("/login");
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return {
          bg: "bg-blue-600/10",
          border: "border-blue-600/30",
          text: "text-blue-400",
          hover: "hover:bg-blue-600/20 hover:border-blue-600/50",
        };
      case "yellow":
        return {
          bg: "bg-yellow-600/10",
          border: "border-yellow-600/30",
          text: "text-yellow-400",
          hover: "hover:bg-yellow-600/20 hover:border-yellow-600/50",
        };
      case "orange":
        return {
          bg: "bg-orange-600/10",
          border: "border-orange-600/30",
          text: "text-orange-400",
          hover: "hover:bg-orange-600/20 hover:border-orange-600/50",
        };
      case "red":
        return {
          bg: "bg-red-600/10",
          border: "border-red-600/30",
          text: "text-red-400",
          hover: "hover:bg-red-600/20 hover:border-red-600/50",
        };
      default:
        return {
          bg: "bg-gray-700/10",
          border: "border-gray-700/30",
          text: "text-gray-400",
          hover: "hover:bg-gray-700/20 hover:border-gray-700/50",
        };
    }
  };

  return (
    <div className="min-h-screen p-5">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Profil</h1>
        </div>
        <p className="text-gray-400 text-xs">
          Gérez vos paramètres de compte et préférences
        </p>
      </div>

      {/* User Info Card */}
      <div className="max-w-3xl mx-auto mb-5">
        <div className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-gray-700/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-base font-semibold">
              AD
            </div>
            <div>
              <h2 className="text-base font-medium text-white mb-0.5">admin</h2>
              <p className="text-xs text-gray-400">admin@example.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Options List */}
      <div className="max-w-3xl mx-auto">
        <div className="space-y-1.5">
          {profileOptions.map((option) => {
            const colors = getColorClasses(option.color);
            return (
              <button
                key={option.id}
                onClick={() => handleAction(option.action)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${colors.bg} ${colors.border} ${colors.hover}`}
              >
                <div className={`w-9 h-9 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                  <option.icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`text-xs font-medium ${colors.text} mb-0.5`}>
                    {option.label}
                  </h3>
                  <p className="text-[11px] text-gray-500">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}