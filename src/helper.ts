import * as encoding from "@walletconnect/encoding";

export function convertHexToNumber(hex: string) {
    try {
        return encoding.hexToNumber(hex);
    } catch (e) {
        return hex;
    }
}
