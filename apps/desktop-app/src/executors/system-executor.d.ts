export declare class SystemExecutor {
    private readonly platform;
    execute(capabilityId: string, parameters: Record<string, any>): Promise<any>;
    private getCPUUsage;
    private getMemoryUsage;
    private getDiskUsage;
    private getNetworkInterfaces;
    private getSystemInfo;
    private shutdown;
    private restart;
    private sleep;
    private formatBytes;
    private formatUptime;
    private parseWindowsDiskInfo;
    private parseUnixDiskInfo;
}
