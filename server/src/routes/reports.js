import { Router } from 'express';
import { reportController } from '../controllers/reports.js';


export const projectReports = Router({ mergeParams: true });
export const reports = Router();

projectReports.get('/', reportController.getProjectReports);

projectReports.post('/analysis', reportController.analysisLimiter, reportController.postProjectReportAnalysis);

reports.get('/:reportId', reportController.getReportByID);

reports.patch('/:reportId/classifications/:index', reportController.patchReportClassificationByIDandIndex);

reports.get('/:reportId/pdf', reportController.getReportByID);
