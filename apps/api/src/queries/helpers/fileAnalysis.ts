/**
 * File Analysis Helpers
 * Common utilities for determining which files should be analyzed
 */

/**
 * Set of file extensions that should be ignored during analysis
 * Includes images, videos, fonts, and binary files
 */
export const IGNORED_FILE_EXTENSIONS = new Set([
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'psd', 'ai', 'tiff', 'tif', 'heic', 'heif',
  // Videos and Audio
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'mp3', 'wav', 'flac', 'ogg',
  // Archives
  'pdf', 'zip', 'rar', '7z', 'tar', 'gz', 'tgz',
  // Fonts
  'woff', 'woff2', 'ttf', 'otf'
]);

/**
 * Check if a file is analyzable based on its extension and patch content
 * Returns false for binary files, files without patches, or ignored extensions
 */
export const isFileAnalyzable = (filename: string, patch?: string): boolean => {
  const ext = (filename?.split('.')?.pop() || '').toLowerCase();
  
  if (IGNORED_FILE_EXTENSIONS.has(ext)) return false;
  if (!patch) return false;
  return true;
};

/**
 * Filter commits to only include analyzable files
 * Removes binary files and files with ignored extensions
 */
export const filterAnalyzableFiles = (commits: any[]): any[] => {
  return commits.map((commit: any) => {
    const filteredFiles = (commit.files || []).filter((file: any) => 
      isFileAnalyzable(file.filename, file.patch)
    );
    
    return {
      ...commit,
      files: filteredFiles.map((file: any) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch
      }))
    };
  });
};

/**
 * Get list of all unique filenames from commits (for analysis)
 * Includes both current and previous filenames (for renamed files)
 */
export const getAnalyzableFilenames = (commits: any[]): string[] => {
  return Array.from(new Set(
    commits
      .flatMap((commit: any) => (commit.files || [])
        .filter((file: any) => isFileAnalyzable(file.filename, file.patch))
        .flatMap((file: any) => [file.filename, file.previousFilename].filter(Boolean)))
  ));
};

/**
 * Get list of all ignored filenames from commits
 */
export const getIgnoredFilenames = (commits: any[]): string[] => {
  return Array.from(new Set(
    commits
      .flatMap((commit: any) => (commit.files || [])
        .filter((file: any) => !isFileAnalyzable(file.filename, file.patch))
        .flatMap((file: any) => [file.filename, file.previousFilename].filter(Boolean)))
  ));
};
