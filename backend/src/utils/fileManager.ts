import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * File management utilities for handling uploads and file operations
 */

export class FileManager {
  private static uploadsDir = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');

  /**
   * Ensure the uploads directory exists
   */
  static ensureUploadsDirectory(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Get the full path to the uploads directory
   */
  static getUploadsDirectory(): string {
    return this.uploadsDir;
  }

  /**
   * Generate a unique filename for an uploaded file
   */
  static generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(6).toString('hex');
    const extension = path.extname(originalFilename);
    return `${timestamp}-${randomString}${extension}`;
  }

  /**
   * Get the full path for a file in the uploads directory
   */
  static getFilePath(filename: string): string {
    return path.join(this.uploadsDir, filename);
  }

  /**
   * Check if a file exists in the uploads directory
   */
  static fileExists(filename: string): boolean {
    const filePath = this.getFilePath(filename);
    return fs.existsSync(filePath);
  }

  /**
   * Delete a file from the uploads directory
   */
  static async deleteFile(filename: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get file information (size, creation time, etc.)
   */
  static async getFileInfo(filename: string): Promise<fs.Stats | null> {
    try {
      const filePath = this.getFilePath(filename);
      if (fs.existsSync(filePath)) {
        return await fs.promises.stat(filePath);
      }
      return null;
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  /**
   * Get file size in bytes
   */
  static async getFileSize(filename: string): Promise<number | null> {
    const stats = await this.getFileInfo(filename);
    return stats ? stats.size : null;
  }

  /**
   * Clean up old files (older than specified days)
   */
  static async cleanupOldFiles(daysOld: number = 30): Promise<number> {
    try {
      const files = await fs.promises.readdir(this.uploadsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file === '.gitkeep') continue; // Skip .gitkeep file
        
        const filePath = path.join(this.uploadsDir, file);
        const stats = await fs.promises.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.promises.unlink(filePath);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      return 0;
    }
  }

  /**
   * Get total size of all files in uploads directory
   */
  static async getTotalStorageUsed(): Promise<number> {
    try {
      const files = await fs.promises.readdir(this.uploadsDir);
      let totalSize = 0;
      
      for (const file of files) {
        if (file === '.gitkeep') continue; // Skip .gitkeep file
        
        const filePath = path.join(this.uploadsDir, file);
        const stats = await fs.promises.stat(filePath);
        totalSize += stats.size;
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating total storage used:', error);
      return 0;
    }
  }

  /**
   * List all files in the uploads directory
   */
  static async listFiles(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.uploadsDir);
      return files.filter(file => file !== '.gitkeep');
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Validate file type based on extension and mime type
   */
  static isValidFileType(filename: string, mimeType: string, allowedTypes: string[] = ['pdf']): boolean {
    const extension = path.extname(filename).toLowerCase().slice(1);
    const isValidExtension = allowedTypes.includes(extension);
    
    // For PDF files, also check mime type
    if (extension === 'pdf') {
      return isValidExtension && mimeType === 'application/pdf';
    }
    
    return isValidExtension;
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get maximum allowed file size from environment
   */
  static getMaxFileSize(): number {
    return parseInt(process.env.MAX_FILE_SIZE || '10485760');
  }

  /**
   * Get maximum allowed file size in human readable format
   */
  static getMaxFileSizeFormatted(): string {
    return this.formatFileSize(this.getMaxFileSize());
  }
}

// Initialize uploads directory on module load
FileManager.ensureUploadsDirectory();

export default FileManager;