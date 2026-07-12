export declare class NetworkExecutor {
    private readonly platform;
    execute(capabilityId: string, parameters: Record<string, any>): Promise<any>;
    private ping;
    private dnsLookup;
    private portCheck;
    private download;
    private getConnections;
    private parseWindowsNetstat;
    private parseUnixNetstat;
}
