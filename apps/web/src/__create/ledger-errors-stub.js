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
