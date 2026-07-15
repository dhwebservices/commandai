import { CaptureQuality, QualityPreset, getQualitySettings } from './types.js';
import { ConnectionQuality } from '../webrtc-config.js';

/**
 * Adaptive quality manager
 * Automatically adjusts stream quality based on connection metrics
 */
export class AdaptiveQualityManager {
  private currentPreset: QualityPreset = 'medium';
  private targetPreset: QualityPreset = 'medium';
  private onQualityChange: (quality: CaptureQuality) => void;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private qualityHistory: ConnectionQuality[] = [];
  private readonly maxHistorySize = 10;

  constructor(
    initialPreset: QualityPreset,
    onQualityChange: (quality: CaptureQuality) => void
  ) {
    this.currentPreset = initialPreset;
    this.targetPreset = initialPreset;
    this.onQualityChange = onQualityChange;
  }

  /**
   * Start monitoring connection quality and adapting
   */
  startMonitoring(getConnectionQuality: () => Promise<ConnectionQuality | null>): void {
    if (this.monitoringInterval) {
      return;
    }

    console.log('[AdaptiveQuality] Starting quality monitoring');

    this.monitoringInterval = setInterval(async () => {
      const quality = await getConnectionQuality();
      if (quality) {
        this.analyzeAndAdapt(quality);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.qualityHistory = [];
  }

  /**
   * Manually set quality preset
   */
  setPreset(preset: QualityPreset): void {
    this.targetPreset = preset;
    this.currentPreset = preset;
    const quality = getQualitySettings(preset);
    this.onQualityChange(quality);
    console.log('[AdaptiveQuality] Manual preset change:', preset);
  }

  /**
   * Analyze connection quality and adapt if needed
   */
  private analyzeAndAdapt(quality: ConnectionQuality): void {
    // Add to history
    this.qualityHistory.push(quality);
    if (this.qualityHistory.length > this.maxHistorySize) {
      this.qualityHistory.shift();
    }

    // Calculate average metrics over history
    const avgLatency =
      this.qualityHistory.reduce((sum, q) => sum + q.latency_ms, 0) /
      this.qualityHistory.length;
    const avgPacketLoss =
      this.qualityHistory.reduce((sum, q) => sum + q.packet_loss, 0) /
      this.qualityHistory.length;
    const avgBitrate =
      this.qualityHistory.reduce((sum, q) => sum + q.bitrate_kbps, 0) /
      this.qualityHistory.length;

    console.log('[AdaptiveQuality] Metrics:', {
      latency: Math.round(avgLatency) + 'ms',
      packetLoss: avgPacketLoss.toFixed(2) + '%',
      bitrate: Math.round(avgBitrate) + 'kbps',
    });

    // Determine target preset based on metrics
    let newPreset = this.currentPreset;

    // Excellent connection - can increase quality
    if (avgLatency < 50 && avgPacketLoss < 1 && avgBitrate > 5000) {
      if (this.currentPreset === 'medium') newPreset = 'high';
      else if (this.currentPreset === 'high') newPreset = 'ultra';
    }
    // Good connection - stay at current or go to high
    else if (avgLatency < 100 && avgPacketLoss < 2 && avgBitrate > 3000) {
      if (this.currentPreset === 'low') newPreset = 'medium';
      else if (this.currentPreset === 'medium') newPreset = 'high';
    }
    // Moderate connection - medium quality
    else if (avgLatency < 150 && avgPacketLoss < 5 && avgBitrate > 1500) {
      if (this.currentPreset === 'low') newPreset = 'medium';
      else if (this.currentPreset === 'high') newPreset = 'medium';
      else if (this.currentPreset === 'ultra') newPreset = 'medium';
    }
    // Poor connection - reduce quality
    else if (avgLatency > 200 || avgPacketLoss > 5 || avgBitrate < 1000) {
      if (this.currentPreset === 'ultra') newPreset = 'high';
      else if (this.currentPreset === 'high') newPreset = 'medium';
      else if (this.currentPreset === 'medium') newPreset = 'low';
    }

    // Apply change if needed
    if (newPreset !== this.currentPreset) {
      this.currentPreset = newPreset;
      const settings = getQualitySettings(newPreset);
      this.onQualityChange(settings);
      console.log('[AdaptiveQuality] Quality adjusted:', {
        preset: newPreset,
        settings,
      });
    }
  }

  /**
   * Get current quality preset
   */
  getCurrentPreset(): QualityPreset {
    return this.currentPreset;
  }

  /**
   * Get quality recommendations based on connection type
   */
  static getRecommendedPreset(connectionType: 'direct' | 'relayed'): QualityPreset {
    // Direct connections can handle higher quality
    if (connectionType === 'direct') {
      return 'high';
    }
    // Relayed connections (TURN) should use lower quality to reduce load
    return 'medium';
  }
}
