import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';

const AnnouncementHeader = ({ onShare }) => {
  return (
    <div className="mb-6 flex justify-between items-center">
      <Link to="/" className="text-blue-600 hover:text-blue-800 flex items-center group">
        <span className="bg-blue-100 p-1.5 rounded-full group-hover:bg-blue-200 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </span>
        <span className="ml-2 font-medium">Back to Home</span>
      </Link>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onShare} 
          className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
        >
          <Share2 className="h-4 w-4 mr-1.5" />
          <span className="font-medium">Share</span>
        </button>
      </div>
    </div>
  );
};

export default AnnouncementHeader;