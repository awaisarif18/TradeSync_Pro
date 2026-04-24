"""
Known symbol name mappings per broker.
These are presets to help users configure their symbol map quickly.
Keys are standardized reference names. Values are broker-specific MT5 symbol names.
"""

BROKER_PRESETS = {
    "Vantage": {
        "XAUUSD":  "XAUUSD",
        "XAGUSD":  "XAGUSD",
        "EURUSD":  "EURUSD",
        "GBPUSD":  "GBPUSD",
        "USDJPY":  "USDJPY",
        "US30":    "US30",
        "US100":   "NAS100",
        "BTCUSD":  "BTCUSD",
    },
    "XM": {
        "XAUUSD":  "XAUUSD",
        "XAGUSD":  "XAGUSD",
        "EURUSD":  "EURUSD",
        "GBPUSD":  "GBPUSD",
        "USDJPY":  "USDJPY",
        "US30":    "US30Cash",
        "US100":   "US100Cash",
        "BTCUSD":  "BTCUSD",
    },
    "Exness": {
        "XAUUSD":  "XAUUSDm",
        "XAGUSD":  "XAGUSDm",
        "EURUSD":  "EURUSDm",
        "GBPUSD":  "GBPUSDm",
        "USDJPY":  "USDJPYm",
        "US30":    "US30m",
        "BTCUSD":  "BTCUSDm",
    },
    "IC Markets": {
        "XAUUSD":  "XAUUSD",
        "XAGUSD":  "XAGUSD",
        "EURUSD":  "EURUSD",
        "GBPUSD":  "GBPUSD",
        "USDJPY":  "USDJPY",
        "US30":    "US30",
        "US100":   "US100",
        "BTCUSD":  "BTCUSD",
    },
    "Pepperstone": {
        "XAUUSD":  "XAUUSD",
        "XAGUSD":  "XAGUSD",
        "EURUSD":  "EURUSD",
        "GBPUSD":  "GBPUSD",
        "USDJPY":  "USDJPY",
        "US30":    "US30Cash",
        "US100":   "NAS100",
        "BTCUSD":  "BTCUSD",
    },
}

# Common master symbols shown in the preset table
COMMON_MASTER_SYMBOLS = [
    "XAUUSD", "XAGUSD", "EURUSD", "GBPUSD",
    "USDJPY", "US30", "US100", "BTCUSD", "ETHUSD"
]
