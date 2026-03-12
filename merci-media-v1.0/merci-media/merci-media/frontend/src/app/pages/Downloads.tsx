import { Download, Music, Video, FileAudio, Folder, HardDrive } from "lucide-react";

export function Downloads() {
  const downloads = [
    {
      id: 1,
      title: "Summer Vibes Mix 2024.flac",
      type: "audio",
      size: "125 MB",
      date: "Il y a 2 heures",
      format: "FLAC",
    },
    {
      id: 2,
      title: "Epic Travel Montage.mp4",
      type: "video",
      size: "850 MB",
      date: "Il y a 5 heures",
      format: "MP4",
    },
    {
      id: 3,
      title: "Midnight Jazz Collection.mp3",
      type: "audio",
      size: "85 MB",
      date: "Hier",
      format: "MP3",
    },
    {
      id: 4,
      title: "Workout Motivation 2024.wav",
      type: "audio",
      size: "210 MB",
      date: "Il y a 2 jours",
      format: "WAV",
    },
  ];

  const totalSize = downloads.reduce((acc, item) => {
    const size = parseFloat(item.size);
    return acc + size;
  }, 0);

  return (
    <div className="min-h-screen p-5">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center">
            <Download className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Téléchargements
          </h1>
        </div>
        <p className="text-gray-400 text-xs">
          Gérez tous vos fichiers téléchargés
        </p>
      </div>

      {/* Storage Info */}
      <div className="max-w-4xl mx-auto mb-5 grid grid-cols-3 gap-3">
        <div className="bg-[#1a1a2e]/60 backdrop-blur-sm border border-gray-700/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-green-400 font-medium text-xs">Total fichiers</h3>
            <Folder className="w-3.5 h-3.5 text-green-400" />
          </div>
          <p className="text-xl font-semibold text-white">{downloads.length}</p>
        </div>

        <div className="bg-[#1a1a2e]/60 backdrop-blur-sm border border-gray-700/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-blue-400 font-medium text-xs">Espace utilisé</h3>
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-semibold text-white">{totalSize.toFixed(0)} MB</p>
        </div>

        <div className="bg-[#1a1a2e]/60 backdrop-blur-sm border border-gray-700/40 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-blue-400 font-medium text-xs">Qualité</h3>
            <FileAudio className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <p className="text-xl font-semibold text-white">HD+</p>
        </div>
      </div>

      {/* Downloads List */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-gray-700/50 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800/30 border-b border-gray-700/50 px-4 py-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-white flex items-center gap-1.5">
                <FileAudio className="w-3.5 h-3.5 text-green-400" />
                Fichiers récents
              </h3>
              <button className="px-2.5 py-1 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-[11px] font-medium hover:bg-red-500/30 transition-all duration-200">
                Tout effacer
              </button>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-700/30">
            {downloads.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all duration-200 group"
              >
                {/* Icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
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
                  <h3 className="text-white font-medium text-xs mb-0.5">{item.title}</h3>
                  <p className="text-gray-400 text-[11px]">{item.date}</p>
                </div>

                {/* Format badge */}
                <div className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                  item.format === "FLAC"
                    ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                    : item.format === "MP4"
                    ? "bg-red-600/20 text-red-400 border border-red-600/30"
                    : item.format === "WAV"
                    ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                    : "bg-green-600/20 text-green-400 border border-green-600/30"
                }`}>
                  {item.format}
                </div>

                {/* Size */}
                <div className="text-gray-400 font-mono text-[11px] w-16 text-right">
                  {item.size}
                </div>

                {/* Download button */}
                <button className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center hover:bg-green-500/20 transition-all duration-200 opacity-0 group-hover:opacity-100">
                  <Download className="w-3.5 h-3.5 text-green-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}