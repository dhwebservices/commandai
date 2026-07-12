export declare class ProcessExecutor {
    private readonly platform;
    execute(capabilityId: string, parameters: Record<string, any>): Promise<any>;
    private listProcesses;
    private getProcessInfo;
    private killProcess;
    private startProcess;
    private launchApp;
    private quitApp;
    private listApplications;
    private listRunningApplications;
    private parseUnixPs;
}
