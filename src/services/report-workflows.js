import api, { workflowRequest } from './api.js';
import { createReportWorkflows } from './report-workflow-client.js';

export const reportWorkflows = createReportWorkflows(api, workflowRequest);
