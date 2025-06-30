import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import upload, { handleUploadErrors } from '../middleware/upload';
import { ValidationMiddleware } from '../middleware/validation';
import { RateLimiter } from '../middleware/rateLimiter';
import { ContractController } from '../controllers/contractController';
import { AnalysisController } from '../controllers/analysisController';

const router = Router();

// All contract routes require authentication
router.use(authenticate);

// Contract upload endpoint with file upload middleware
router.post('/upload', 
  RateLimiter.upload,
  upload.single('contract'),
  handleUploadErrors,
  ValidationMiddleware.validateFileUpload({
    required: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['pdf']
  }),
  ValidationMiddleware.validateBody([
    { field: 'nickname', required: false, type: 'string', maxLength: 100, sanitize: true },
    { field: 'contractor_name', required: false, type: 'string', maxLength: 200, sanitize: true },
    { field: 'project_name', required: false, type: 'string', maxLength: 200, sanitize: true }
  ]),
  ContractController.uploadContract
);

// Get all contracts for authenticated user
router.get('/', 
  ValidationMiddleware.validateQuery([
    { field: 'page', required: false, type: 'number', min: 1, max: 1000 },
    { field: 'limit', required: false, type: 'number', min: 1, max: 100 }
  ]),
  ContractController.getContracts
);

// Get specific contract details
router.get('/:id',
  ValidationMiddleware.validateParams([
    { field: 'id', required: true, type: 'number', min: 1 }
  ]),
  ContractController.getContract
);

// Delete contract (optional but recommended)
router.delete('/:id',
  ValidationMiddleware.validateParams([
    { field: 'id', required: true, type: 'number', min: 1 }
  ]),
  ContractController.deleteContract
);

// Analysis routes
// Start contract analysis
router.post('/:id/analyze',
  RateLimiter.analysis,
  ValidationMiddleware.validateParams([
    { field: 'id', required: true, type: 'number', min: 1 }
  ]),
  AnalysisController.analyzeContract
);

// Get analysis status
router.get('/:id/analysis/status',
  ValidationMiddleware.validateParams([
    { field: 'id', required: true, type: 'number', min: 1 }
  ]),
  AnalysisController.getAnalysisStatus
);

// Get analysis results
router.get('/:id/analysis/results',
  ValidationMiddleware.validateParams([
    { field: 'id', required: true, type: 'number', min: 1 }
  ]),
  AnalysisController.getAnalysisResults
);

// Generate and download PDF report
router.get('/:id/report/pdf',
  RateLimiter.report,
  ValidationMiddleware.validateParams([
    { field: 'id', required: true, type: 'number', min: 1 }
  ]),
  AnalysisController.generateReport
);

export default router;