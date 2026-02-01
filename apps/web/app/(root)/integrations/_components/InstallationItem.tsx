import React, { useState } from "react";
import Image from "next/image";

interface InstallationItemProps {
  avatarUrl?: string | null;
  login: string;
  displayName?: string;
  profileUrl?: string;
}

export const InstallationItem: React.FC<InstallationItemProps> = ({ avatarUrl, login, displayName, profileUrl }) => {
  const [imageError, setImageError] = useState(false);
  const firstChar = (displayName || login || '?').charAt(0).toUpperCase();
  
  const content = (
    <div className="inline-flex items-center gap-2 text-[10px] bg-secondary/30 px-2 py-1 rounded-full border border-border/50 hover:bg-secondary/50 hover:border-border transition-colors cursor-pointer group">
      {avatarUrl && !imageError ? (
        <Image 
          src={avatarUrl} 
          alt={login} 
          width={14} 
          height={14} 
          className="rounded-full shadow-sm"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-semibold text-primary">
          {firstChar}
        </div>
      )}
      <span className="text-muted-foreground/80 font-medium truncate max-w-[100px] group-hover:text-foreground transition-colors">{displayName || login}</span>
    </div>
  );

  if (profileUrl) {
    return (
      <a href={profileUrl} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
};
