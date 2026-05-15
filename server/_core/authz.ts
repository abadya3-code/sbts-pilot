export const BACKEND_AUTHORIZATION_MATRIX = {
  adminOnly: [
    "core.saveSystemSettings",
    "core.createEmployee",
    "core.updateEmployee",
    "core.deleteEmployee",
    "core.saveTagSettings",
    "core.deleteArea",
    "core.deleteProject",
    "workflow.delete",
  ],
  coordinatorOrAdmin: [
    "core.createArea",
    "core.updateArea",
    "core.createProject",
    "core.updateProject",
  ],
  supervisorOrAdmin: [
    "core.savePhaseAssignments",
  ],
  authenticated: [
    "core.createBlind",
    "core.moveBlindPhase",
    "core.approveRequest",
    "core.issueCertificate",
    "core.recordTagPrint",
    "core.recordReportExport",
  ],
  publicReadOnly: [
    "core.areas",
    "core.projects",
    "core.blinds",
    "core.dashboardSummary",
    "core.systemSettings",
    "core.persistenceStatus",
  ],
} as const;

export type BackendAuthorizationMatrix = typeof BACKEND_AUTHORIZATION_MATRIX;
