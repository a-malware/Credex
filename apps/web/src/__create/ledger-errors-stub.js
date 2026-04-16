// Stub for Ledger packages - only used during SSR
// These packages are wallet-specific and not needed on the server

export const serializeError = () => {};
export const deserializeError = () => {};
export const createCustomErrorClass = (name) => class extends Error { constructor(message) { super(message); this.name = name; } };
export const addCustomErrorDeserializer = () => {};

// Export all error classes as stubs
export const AccountNameRequiredError = class extends Error {};
export const AccountNotSupported = class extends Error {};
export const AccountAwaitingSendPendingOperations = class extends Error {};
export const AmountRequired = class extends Error {};
export const BluetoothRequired = class extends Error {};
export const BtcUnmatchedApp = class extends Error {};
export const CantOpenDevice = class extends Error {};
export const CashAddrNotSupported = class extends Error {};
export const ClaimRewardsFeesWarning = class extends Error {};
export const CurrencyNotSupported = class extends Error {};
export const DeviceAppVerifyNotSupported = class extends Error {};
export const DeviceGenuineSocketEarlyClose = class extends Error {};
export const DeviceNotGenuineError = class extends Error {};
export const DeviceOnDashboardExpected = class extends Error {};
export const DeviceOnDashboardUnexpected = class extends Error {};
export const DeviceInOSUExpected = class extends Error {};
export const DeviceHalted = class extends Error {};
export const DeviceNameInvalid = class extends Error {};
export const DeviceSocketFail = class extends Error {};
export const DeviceSocketNoBulkStatus = class extends Error {};
export const DeviceNeedsRestart = class extends Error {};
export const UnresponsiveDeviceError = class extends Error {};
export const DisconnectedDevice = class extends Error {};
export const DisconnectedDeviceDuringOperation = class extends Error {};
export const DeviceExtractOnboardingStateError = class extends Error {};
export const DeviceOnboardingStatePollingError = class extends Error {};
export const EnpointConfigError = class extends Error {};
export const EthAppPleaseEnableContractData = class extends Error {};

// Additional exports for @ledgerhq/hw-transport
export const TransportStatusError = class extends Error {
  constructor(statusCode, message) {
    super(message || `Transport error: ${statusCode}`);
    this.statusCode = statusCode;
  }
};
export const TransportError = class extends Error {};
export const TransportOpenUserCancelled = class extends Error {};
export const TransportInterfaceNotSupported = class extends Error {};
export const TransportRaceCondition = class extends Error {};
export const TransportCanceledUserAction = class extends Error {};
export const TransportWeakRandomness = class extends Error {};
export const TransportExchangeTimeoutError = class extends Error {};
export const TransportInvalidAppResponse = class extends Error {};
export const TransportInvalidChannel = class extends Error {};
export const TransportInvalidPayload = class extends Error {};
export const TransportMissingAppDependencies = class extends Error {};
export const TransportPermissionDenied = class extends Error {};
export const TransportPrepareTransactionSigningError = class extends Error {};
export const TransportTooManyTransportUInstances = class extends Error {};
export const TransportUserCancelled = class extends Error {};
export const TransportWebHIDNotSupported = class extends Error {};
export const TransportWebUSBGestureRequired = class extends Error {};
export const TransportWebUSBNotSupported = class extends Error {};
export const TransportWindowClosedError = class extends Error {};
export const TransportNotReadyError = class extends Error {};
export const TransportNoBluetooth = class extends Error {};
export const TransportNoDevice = class extends Error {};
export const TransportNotSupported = class extends Error {};
export const TransportRejected = class extends Error {};
export const TransportTimeout = class extends Error {};
export const TransportUnknownError = class extends Error {};
export const TransportVersionMismatch = class extends Error {};
export const TransportWebsocketError = class extends Error {};
export const TransportWebsocketNotAvailable = class extends Error {};
export const TransportWebsocketSSLError = class extends Error {};
export const TransportWebsocketTimeoutError = class extends Error {};
export const TransportWebsocketUnknownError = class extends Error {};

// Default export
export default {
  serializeError,
  deserializeError,
  createCustomErrorClass,
  addCustomErrorDeserializer,
  TransportStatusError,
};
