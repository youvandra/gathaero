// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

enum Outcome {
    OnTime,
    Delayed
}

enum MarketKind {
    Protection,
    Threshold,
    Range
}

struct Flight {
    string number;
    uint64 scheduledArrival;
    uint16 delayThresholdMinutes;
}

struct Resolution {
    int32 delayMinutes;
    bool finalized;
}
