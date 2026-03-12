import { Film, Download, Star, AlertTriangle } from "lucide-react";

export function Films() {
  const films = [
    {
      id: 1,
      title: "Inception",
      year: "2010",
      genre: "Science-Fiction",
      rating: 8.8,
      size: "2.4 GB",
      quality: "1080p",
    },
    {
      id: 2,
      title: "The Dark Knight",
      year: "2008",
      genre: "Action",
      rating: 9.0,
      size: "2.1 GB",
      quality: "1080p",
    },
    {
      id: 3,
      title: "Interstellar",
      year: "2014",
      genre: "Science-Fiction",
      rating: 8.6,
      size: "2.8 GB",
      quality: "1080p",
    },
    {
      id: 4,
      title: "Pulp Fiction",
      year: "1994",
      genre: "Crime",
      rating: 8.9,
      size: "1.9 GB",
      quality: "1080p",
    },
    {
      id: 5,
      title: "The Shawshank Redemption",
      year: "1994",
      genre: "Drama",
      rating: 9.3,
      size: "2.2 GB",
      quality: "1080p",
    },
    {
      id: 6,
      title: "The Matrix",
      year: "1999",
      genre: "Science-Fiction",
      rating: 8.7,
      size: "2.0 GB",
      quality: "1080p",
    },
  ];

  return (
    <div className="min-h-screen p-5">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
            <Film className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">
            The Good Place
          </h1>
        </div>
        <p className="text-gray-400 text-xs">
          Découvrez et téléchargez vos films préférés en haute qualité
        </p>
      </div>

      {/* Warning Messages - Red */}
      <div className="max-w-5xl mx-auto mb-5 space-y-2">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-400 font-medium text-xs mb-0.5">Avertissement légal</h3>
              <p className="text-red-300/80 text-[11px] leading-relaxed">
                Le téléchargement de certains contenus protégés par des droits d'auteur peut être illégal dans votre pays. 
                Assurez-vous de respecter les lois en vigueur.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3">
          <div className="flex gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-500 font-medium text-xs mb-0.5">Responsabilité</h3>
              <p className="text-red-400/80 text-[11px] leading-relaxed">
                L'utilisation de ce service est sous votre entière responsabilité. Nous nous dégageons de toute responsabilité 
                concernant l'utilisation que vous faites de ce service et des contenus téléchargés.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Films Grid */}
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-3 gap-3">
          {films.map((film) => (
            <div
              key={film.id}
              className="bg-[#1a1a2e]/80 backdrop-blur-xl border border-gray-700/50 rounded-lg overflow-hidden hover:border-purple-500/40 transition-all duration-200 group"
            >
              {/* Poster placeholder */}
              <div className="w-full h-40 bg-gradient-to-br from-purple-900/30 to-gray-900 flex items-center justify-center border-b border-gray-700/50">
                <Film className="w-10 h-10 text-gray-600" />
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="mb-2.5">
                  <h3 className="text-white font-medium text-xs mb-0.5">{film.title}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <span>{film.year}</span>
                    <span>•</span>
                    <span>{film.genre}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-medium text-white">{film.rating}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-blue-600/20 border border-blue-600/30 rounded text-[10px] text-blue-400 font-medium">
                      {film.quality}
                    </span>
                    <span className="text-[11px] text-gray-400">{film.size}</span>
                  </div>
                </div>

                <button className="w-full py-1.5 rounded-lg bg-purple-600/20 border border-purple-600/40 hover:bg-purple-600/30 text-purple-400 text-[11px] font-medium transition-all duration-200 flex items-center justify-center gap-1">
                  <Download className="w-3 h-3" />
                  Télécharger
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}