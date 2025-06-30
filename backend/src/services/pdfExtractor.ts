import * as fs from 'fs';
import * as path from 'path';

// Type definition for pdf-parse since @types/pdf-parse doesn't exist
interface PDFInfo {
  PDFFormatVersion?: string;
  IsAcroFormPresent?: boolean;
  IsXFAPresent?: boolean;
  Title?: string;
  Author?: string;
  Subject?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
  IsEncrypted?: boolean;
}

interface PDFData {
  numpages: number;
  numrender: number;
  info: PDFInfo;
  metadata: any;
  version: string;
  text: string;
}

// Import pdf-parse as any to avoid type issues
const pdfParse: (buffer: Buffer, options?: any) => Promise<PDFData> = require('pdf-parse');

interface PdfExtractionResult {
  text: string;
  pageCount: number;
  metadata: any;
}

interface PdfExtractionError {
  message: string;
  code: string;
  originalError?: Error;
}

/**
 * Extracts text and metadata from a PDF file
 * @param filePath - Absolute path to the PDF file
 * @returns Promise<PdfExtractionResult> - Object containing extracted text, page count, and metadata
 * @throws PdfExtractionError - When PDF extraction fails
 */
export async function extractTextFromPDF(filePath: string): Promise<PdfExtractionResult> {
  try {
    // Validate file path
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path provided');
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Check if file has PDF extension
    const fileExtension = path.extname(filePath).toLowerCase();
    if (fileExtension !== '.pdf') {
      throw new Error(`Invalid file type. Expected PDF, got: ${fileExtension}`);
    }

    // Check file size (basic validation)
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('PDF file is empty');
    }

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(filePath);
    
    // Validate buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Failed to read PDF file or file is empty');
    }

    // Extract text and metadata using pdf-parse
    const pdfData = await pdfParse(pdfBuffer, {
      // Options for pdf-parse
      max: 0, // Extract all pages (0 means no limit)
      version: 'v1.10.100' // Specify version for consistency
    });

    // Validate extraction results
    if (!pdfData) {
      throw new Error('PDF parsing failed - no data returned');
    }

    // Extract and clean text
    let extractedText = pdfData.text || '';
    
    // Clean up text: remove excessive whitespace and normalize line breaks
    extractedText = extractedText
      .replace(/\r\n/g, '\n') // Normalize line breaks
      .replace(/\r/g, '\n')   // Convert remaining \r to \n
      .replace(/\n{3,}/g, '\n\n') // Replace multiple line breaks with double line breaks
      .trim(); // Remove leading/trailing whitespace

    // Get page count
    const pageCount = pdfData.numpages || 0;

    // Extract metadata
    const metadata = {
      pageCount: pageCount,
      fileSize: stats.size,
      filePath: filePath,
      fileName: path.basename(filePath),
      creationDate: pdfData.info?.CreationDate || null,
      modificationDate: pdfData.info?.ModDate || null,
      title: pdfData.info?.Title || null,
      author: pdfData.info?.Author || null,
      subject: pdfData.info?.Subject || null,
      creator: pdfData.info?.Creator || null,
      producer: pdfData.info?.Producer || null,
      version: pdfData.version || null,
      isEncrypted: pdfData.info?.IsEncrypted || false,
      extractedAt: new Date().toISOString()
    };

    // Validate that we have meaningful content
    if (extractedText.length === 0) {
      console.warn(`Warning: No text extracted from PDF: ${filePath}`);
    }

    if (pageCount === 0) {
      console.warn(`Warning: PDF appears to have 0 pages: ${filePath}`);
    }

    return {
      text: extractedText,
      pageCount: pageCount,
      metadata: metadata
    };

  } catch (error) {
    // Handle different types of errors
    let errorMessage = 'Unknown error occurred during PDF extraction';
    let errorCode = 'UNKNOWN_ERROR';

    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Categorize common error types
      if (error.message.includes('File not found')) {
        errorCode = 'FILE_NOT_FOUND';
      } else if (error.message.includes('Invalid file type')) {
        errorCode = 'INVALID_FILE_TYPE';
      } else if (error.message.includes('empty')) {
        errorCode = 'EMPTY_FILE';
      } else if (error.message.includes('parsing failed') || error.message.includes('Invalid PDF')) {
        errorCode = 'CORRUPTED_PDF';
      } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
        errorCode = 'PERMISSION_DENIED';
      } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
        errorCode = 'TOO_MANY_FILES';
      } else {
        errorCode = 'EXTRACTION_FAILED';
      }
    }

    // Log the error for debugging
    console.error(`PDF extraction failed for file: ${filePath}`, {
      error: errorMessage,
      code: errorCode,
      originalError: error
    });

    // Throw a structured error
    const extractionError: PdfExtractionError = {
      message: errorMessage,
      code: errorCode,
      originalError: error instanceof Error ? error : undefined
    };

    throw extractionError;
  }
}

/**
 * Validates if a file is a valid PDF by checking its header
 * @param filePath - Path to the file to validate
 * @returns boolean - True if file appears to be a valid PDF
 */
export function isValidPDF(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // Read first 4 bytes to check PDF header
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    const header = buffer.toString('ascii');
    
    // PDF files should start with "%PDF"
    return header === '%PDF';
  } catch (error) {
    console.error('Error validating PDF:', error);
    return false;
  }
}

/**
 * Extracts text from multiple PDF files concurrently
 * @param filePaths - Array of PDF file paths
 * @param maxConcurrency - Maximum number of concurrent extractions (default: 3)
 * @returns Promise<Array<{filePath: string, result?: PdfExtractionResult, error?: PdfExtractionError}>>
 */
export async function extractTextFromMultiplePDFs(
  filePaths: string[], 
  maxConcurrency: number = 3
): Promise<Array<{
  filePath: string;
  result?: PdfExtractionResult;
  error?: PdfExtractionError;
}>> {
  const results: Array<{
    filePath: string;
    result?: PdfExtractionResult;
    error?: PdfExtractionError;
  }> = [];

  // Process files in batches to control concurrency
  for (let i = 0; i < filePaths.length; i += maxConcurrency) {
    const batch = filePaths.slice(i, i + maxConcurrency);
    
    const batchPromises = batch.map(async (filePath) => {
      try {
        const result = await extractTextFromPDF(filePath);
        return { filePath, result };
      } catch (error) {
        return { 
          filePath, 
          error: error as PdfExtractionError 
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * PDF Extractor Service class for use in controllers
 */
export class PDFExtractorService {
  /**
   * Validate PDF file from multer upload
   */
  static validatePDF(file: Express.Multer.File): void {
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file extension
    const allowedExtensions = ['.pdf'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error(`Invalid file type. Only PDF files are allowed. Got: ${fileExtension}`);
    }

    // Check MIME type
    const allowedMimeTypes = ['application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Invalid MIME type. Expected PDF, got: ${file.mimetype}`);
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is 10MB, got: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Check if file has content
    if (file.size === 0) {
      throw new Error('File is empty');
    }
  }

  /**
   * Extract text from PDF buffer
   */
  static async extractText(buffer: Buffer): Promise<{
    text: string;
    pages: number;
    metadata?: any;
  }> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Invalid or empty buffer provided');
    }

    try {
      // Extract text using pdf-parse
      const pdfData = await pdfParse(buffer, {
        max: 0, // Extract all pages
        version: 'v1.10.100'
      });

      if (!pdfData) {
        throw new Error('PDF parsing failed - no data returned');
      }

      // Clean up text
      let extractedText = pdfData.text || '';
      extractedText = extractedText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      // Get page count
      const pageCount = pdfData.numpages || 0;

      // Extract metadata
      const metadata = {
        pageCount: pageCount,
        title: pdfData.info?.Title || null,
        author: pdfData.info?.Author || null,
        subject: pdfData.info?.Subject || null,
        creator: pdfData.info?.Creator || null,
        producer: pdfData.info?.Producer || null,
        creationDate: pdfData.info?.CreationDate || null,
        modificationDate: pdfData.info?.ModDate || null,
        version: pdfData.version || null,
        isEncrypted: pdfData.info?.IsEncrypted || false,
        extractedAt: new Date().toISOString()
      };

      return {
        text: extractedText,
        pages: pageCount,
        metadata: metadata
      };

    } catch (error) {
      console.error('PDF extraction error:', error);
      if (error instanceof Error) {
        throw new Error(`PDF extraction failed: ${error.message}`);
      }
      throw new Error('PDF extraction failed with unknown error');
    }
  }

  /**
   * Extract text from file path
   */
  static async extractTextFromFile(filePath: string): Promise<{
    text: string;
    pages: number;
    metadata?: any;
  }> {
    const result = await extractTextFromPDF(filePath);
    return {
      text: result.text,
      pages: result.pageCount,
      metadata: result.metadata
    };
  }
}

export default {
  extractTextFromPDF,
  isValidPDF,
  extractTextFromMultiplePDFs,
  PDFExtractorService
};