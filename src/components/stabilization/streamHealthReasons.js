function numOrNull(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value);
}

function qualityLabel(label) {
  if (!label) return null;
  return String(label).replace(/_/g, ' ');
}

/**
 * Mirrors mobile `computeStreamHealthLevel` thresholds — returns why a device is critical or warning.
 */
export function getStreamHealthReasons(device) {
  const critical = [];
  const warning = [];

  const conn = device?.rtcConnectionStateLabel;
  const txQ = device?.rtcTxQualityLabel;
  const rxQ = device?.rtcRxQualityLabel;
  const txLoss = numOrNull(device?.rtcTxPacketLossPct) ?? 0;
  const rxLoss = numOrNull(device?.rtcRxPacketLossPct) ?? 0;
  const loss = Math.max(txLoss, rxLoss);
  const rtt = numOrNull(device?.rtcRttMs) ?? 0;
  const fps = numOrNull(device?.rtcFps);
  const reconnects = numOrNull(device?.rtcReconnectCount) ?? 0;
  const battery = numOrNull(device?.batteryLevelPct);
  const batteryLow =
    battery != null && battery >= 0 && battery <= 100 ? battery : null;

  if (conn === 'failed') critical.push('RTC connection failed');
  if (conn === 'disconnected') critical.push('RTC disconnected');
  if (txQ === 'down') critical.push('Upload network quality down');
  if (rxQ === 'down') critical.push('Download network quality down');

  if (loss >= 10) critical.push(`High packet loss (${Math.round(loss)}%)`);
  else if (loss >= 3) warning.push(`Elevated packet loss (${Math.round(loss)}%)`);

  if (rtt >= 500) critical.push(`Very high latency (${Math.round(rtt)} ms RTT)`);
  else if (rtt >= 200) warning.push(`High latency (${Math.round(rtt)} ms RTT)`);

  if (txQ === 'bad' || txQ === 'very_bad') {
    critical.push(`Poor upload quality (${qualityLabel(txQ)})`);
  } else if (txQ === 'poor') {
    warning.push('Upload quality poor');
  }

  if (rxQ === 'bad' || rxQ === 'very_bad') {
    critical.push(`Poor download quality (${qualityLabel(rxQ)})`);
  } else if (rxQ === 'poor') {
    warning.push('Download quality poor');
  }

  if (reconnects >= 3) critical.push(`${reconnects} RTC reconnects`);
  else if (reconnects >= 1) {
    warning.push(`${reconnects} RTC reconnect${reconnects === 1 ? '' : 's'}`);
  }

  if (batteryLow != null && batteryLow <= 10) {
    critical.push(`Battery critically low (${Math.round(batteryLow)}%)`);
  } else if (batteryLow != null && batteryLow <= 20) {
    warning.push(`Battery low (${Math.round(batteryLow)}%)`);
  }

  if (conn === 'reconnecting') warning.push('RTC reconnecting');

  if (fps != null && fps > 0 && fps < 15) {
    warning.push(`Low frame rate (${Math.round(fps)} fps)`);
  }

  if (device?.networkIsConnected === false) critical.push('Device network disconnected');
  else if (device?.networkIsInternetReachable === false) {
    warning.push('No internet reachability');
  }

  return { critical, warning };
}

/** Reasons that explain the device's current streamHealthLevel badge. */
export function getActiveStreamHealthReasons(device) {
  const level = device?.streamHealthLevel;
  if (!level || level === 'healthy' || level === 'unknown') return [];

  const { critical, warning } = getStreamHealthReasons(device);

  if (level === 'critical') {
    if (critical.length > 0) return critical;
    if (warning.length > 0) return warning;
    return ['Stream health degraded — check Agora stats below'];
  }

  if (level === 'warning') {
    if (warning.length > 0) return warning;
    return ['Stream health warning — check Agora stats below'];
  }

  return [];
}
