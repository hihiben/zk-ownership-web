import { SignClientTypes } from "@walletconnect/types";
import { getSdkError } from "@walletconnect/utils";
import { convertHexToNumber } from "./helper";
import { signClient, callbackTxInfo } from "./wcSetup";

export function wcSessionRequestModal(requestEvent: SignClientTypes.EventArguments["session_request"]) {
    // Get required proposal data
    const { id, params } = requestEvent;
    const { request } = params;
    const { to, data } = request.params[0];
    const value = request.params[0].value ? convertHexToNumber(request.params[0].value) : 0;
    console.log("Request ID:", id);
    console.log("Method:", request.method);
    console.log("To Address:", to);
    console.log("Value:", value);
    console.log("CallData:", data);
    callbackTxInfo(to, value.toString(), data);

    onReject();

    // Hanlde reject action
    async function onReject() {
        if (requestEvent) {
            await signClient.reject({
                id,
                reason: getSdkError("USER_REJECTED_METHODS"),
            });
        }
    }
}
