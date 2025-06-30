// Example usage of the PDF extractor service
import { extractTextFromPDF, isValidPDF, extractTextFromMultiplePDFs } from './pdfExtractor';

// Example 1: Extract text from a single PDF
async function extractSinglePDF() {
  try {
    const filePath = '/path/to/your/document.pdf';
    
    // Validate PDF first (optional)
    if (!isValidPDF(filePath)) {
      console.log('Invalid PDF file');
      return;
    }

    const result = await extractTextFromPDF(filePath);
    
    console.log('Extraction successful!');
    console.log('Page count:', result.pageCount);
    console.log('Text length:', result.text.length);
    console.log('First 200 characters:', result.text.substring(0, 200));
    console.log('Metadata:', result.metadata);
    
  } catch (error: any) {
    console.error('Extraction failed:', error.message);
    console.error('Error code:', error.code);
  }
}

// Example 2: Extract text from multiple PDFs
async function extractMultiplePDFs() {
  const filePaths = [
    '/path/to/document1.pdf',
    '/path/to/document2.pdf',
    '/path/to/document3.pdf'
  ];

  try {
    const results = await extractTextFromMultiplePDFs(filePaths, 2); // Max 2 concurrent
    
    results.forEach(({ filePath, result, error }) => {
      if (result) {
        console.log(`✓ ${filePath}: ${result.pageCount} pages, ${result.text.length} characters`);
      } else if (error) {
        console.log(`✗ ${filePath}: ${error.message} (${error.code})`);
      }
    });
    
  } catch (error) {
    console.error('Batch extraction failed:', error);
  }
}

// Example 3: Using in an Express route
import express from 'express';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/extract-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const filePath = req.file.path;
    
    // Validate it's a PDF
    if (!isValidPDF(filePath)) {
      return res.status(400).json({ error: 'Invalid PDF file' });
    }

    // Extract text
    const extractionResult = await extractTextFromPDF(filePath);
    
    // Return results
    res.json({
      success: true,
      data: {
        text: extractionResult.text,
        pageCount: extractionResult.pageCount,
        metadata: {
          fileName: extractionResult.metadata.fileName,
          fileSize: extractionResult.metadata.fileSize,
          pageCount: extractionResult.metadata.pageCount,
          creationDate: extractionResult.metadata.creationDate,
          title: extractionResult.metadata.title,
          author: extractionResult.metadata.author
        }
      }
    });

  } catch (error: any) {
    console.error('PDF extraction error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: error.code || 'EXTRACTION_FAILED'
      }
    });
  }
});

export { router as pdfExtractionRouter };

// Uncomment to run examples
// extractSinglePDF();
// extractMultiplePDFs();