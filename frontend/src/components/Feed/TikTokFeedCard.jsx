import React from 'react';
import { TikTok } from 'react-tiktok';

const TikTokFeedCard = ({ video, isActive }) => {
  return (
    <div className="relative w-full h-full bg-black text-white flex flex-col justify-center items-center overflow-hidden snap-start">
      <div className="absolute top-6 left-4 z-10 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-indigo-900/50 text-indigo-400">
        ✨ ChambaTutorial
      </div>
      
      {/* TikTok Player */}
      <div className="w-full h-full max-h-[85vh] flex items-center justify-center pointer-events-auto">
        <TikTok url={video.tiktok_url} width="100%" />
      </div>

      <div className="absolute bottom-20 left-4 right-20 z-10 text-left pointer-events-none">
        <h3 className="font-bold text-xl drop-shadow-md mb-2">{video.titulo}</h3>
      </div>
    </div>
  );
};

export default TikTokFeedCard;
