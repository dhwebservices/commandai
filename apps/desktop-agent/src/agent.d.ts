export interface Intent {
    id: string;
    tenantId: string;
    capabilityId: string;
    parameters: Record<string, any>;
    reasoning: string;
    requestedBy: string;
    createdAt: string;
}
export interface ActionResult {
    intentId: string;
    status: "pending" | "running" | "completed" | "failed";
    result?: any;
    error?: string;
    startedAt?: string;
    completedAt?: string;
}
export declare class DesktopAgent {
    private fileExecutor;
    private systemExecutor;
    private processExecutor;
    private networkExecutor;
    executeIntent(intent: Intent): Promise<ActionResult>;
    private executeCapability;
    private executeClipboard;
    private executeScreenshot;
    getCapabilities(): string[];
}
