export interface wallet {
    address: string,
    privateKey: string,
    signTransaction: Function,
    sign: Function
}

export interface transaction {
    to: string,
    data: string
}

