import { Router } from 'express';
import { documentController } from '../controllers/documents.js';

export const projectDocs = Router({ mergeParams: true });
export const docs = Router();

projectDocs.get('/', documentController.getDocuments);

projectDocs.post('/', documentController.upload.single('file'), documentController.postDocument);

docs.get('/:docId', documentController.getDocumentID);

docs.get('/:docId/download', documentController.downloadDocument);

docs.post('/:docId/extract', documentController.postExtractedDocument);

docs.put('/:docId/review', documentController.reviewDocument);

// Copy selected reviewed fields onto the project (explicit user action).
docs.post('/:docId/apply', documentController.applyDocument);

docs.delete('/:docId', documentController.deleteDocument);
