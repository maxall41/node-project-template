export enum PendingPurchaseStatus {
    completed = "completed",
    dropped = "dropped",
    fraud = "fraud",
    pending = "pending",
}

export interface IPurchase {
    txnHash: string,
    to: string, // User id of artist sending to
    status: PendingPurchaseStatus,
    amountUSD: number,
    amountWEI: number,
    id: string
}
