import { List, Music, Video, Trash2, PlayCircle, Clock, CheckCircle2 } from "lucide-react";

export function Queue() {
  const queueItems = [
    {
      id: 1,
      title: "Summer Vibes Mix 2024",
      artist: "DJ Paradise",
      type: "audio",
      status: "downloading",
      progress: 45,
      size: "125 MB",
    },
    {
      id: 2,
      title: "Epic Travel Montage",
      artist: "Travel Channel",
      type: "video",
      status: "waiting",
      progress: 0,
      size: "850 MB",
    },
    {
      id: 3,
      title: "Midnight Jazz Collection",
      artist: "Various Artists",
      type: "audio",
      status: "completed",
      progress: 100,
      size: "320 MB",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "downloading":
        return "text-blue-400";
      case "waiting":
        return "text-yellow-400";
      case "completed":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "downloading":
        return PlayCircle;
      case "waiting":
        return Clock;
      case "completed":
        return CheckCircle2;
      default:
        return Clock;
    }
  };

  return (
    <div className="min-h-screen p-5">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <List className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">
            File d'attente
          </h1>
        </div>
        <p className="text-gray-400 text-xs">
          Suivez vos téléchargements en cours et à venir
        </p>
      </div>

      {/* Queue Stats */}
      <div className="max-w-4xl mx-auto mb-5 grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a2e]/60 backdrop-blur-sm border border-gray-700/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-blue-400 font-medium text-xs">En cours</h3>
            <PlayCircle className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-semibold text-white">1</p>
        </div>

        <div className="bg-[#1a1a2e]/60 backdrop-blur-sm border border-gray-700/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-yellow-400 font-medium text-xs">En attente</h3>
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <p className="text-xl font-semibold text-white">1</p>
        </div>

        <div className="bg-[#1a1a2e]/60 backdrop-blur-sm border border-gray-700/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-green-400 font-medium text-xs">Terminés</h3>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          </div>
          <p className="text-xl font-semibold text-white">1</p>
        </div>
      </div>

      {/* Queue Items */}
      <div className="max-w-4xl mx-auto space-y-2.5">
        {queueItems.map((item) => {
          const StatusIcon = getStatusIcon(item.status);
          return (
            <div
              key={item.id}
              className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-gray-700/50 rounded-lg p-3 hover:border-blue-500/40 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                {/* Type Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  item.type === "audio" 
                    ? "bg-blue-600/20 border border-blue-600/30" 
                    : "bg-red-600/20 border border-red-600/30"
                }`}>
                  {item.type === "audio" ? (
                    <Music className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Video className="w-4 h-4 text-red-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h3 className="text-xs font-medium text-white mb-0.5">{item.title}</h3>
                  <p className="text-gray-400 text-[11px] mb-1.5">{item.artist}</p>
                  
                  {/* Progress bar */}
                  {item.status !== "waiting" && (
                    <div className="relative w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.status === "completed"
                            ? "bg-green-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${getStatusColor(item.status)} mb-0.5`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-medium">
                        {item.status === "downloading" ? "Téléchargement" : 
                         item.status === "waiting" ? "En attente" : "Terminé"}
                      </span>
                    </div>
                    <p className="text-gray-400 text-[11px]">{item.size}</p>
                  </div>

                  {/* Delete button */}
                  <button className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all duration-200 opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state when no items */}
      {queueItems.length === 0 && (
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="w-14 h-14 rounded-xl bg-gray-800/50 flex items-center justify-center mx-auto mb-3">
            <List className="w-7 h-7 text-gray-600" />
          </div>
          <h3 className="text-base font-medium text-gray-400 mb-1">Aucun téléchargement</h3>
          <p className="text-gray-500 text-xs">Vos téléchargements apparaîtront ici</p>
        </div>
      )}
    </div>
  );
}