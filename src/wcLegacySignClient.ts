import LegacySignClient from "@walletconnect/client";
import { getSdkError } from "@walletconnect/utils";
import { IWalletConnectSession, IClientMeta } from "@walletconnect/legacy-types";
import { convertHexToNumber } from "./helper";
import { callbackTxInfo, account } from "./wcSetup";

export let legacySignClient: LegacySignClient;

export function createLegacySignClient({ uri }: { uri?: string } = {}) {
    // If URI is passed always create a new session,
    // otherwise fall back to cached session if client isn't already instantiated.
    if (uri) {
        deleteCachedLegacySession();
        legacySignClient = new LegacySignClient({ uri });
    } else if (!legacySignClient && getCachedLegacySession()) {
        const session = getCachedLegacySession();
        legacySignClient = new LegacySignClient({ session });
    } else {
        return;
    }

    legacySignClient.on("session_request", (error, payload) => {
        console.log("legacy session_request", payload);
        if (error) {
            throw new Error(`legacySignClient > session_request failed: ${error}`);
        }
        LegacySessionProposalModal(payload);
    });

    legacySignClient.on("connect", () => {
        console.log("legacySignClient > connect");
    });

    legacySignClient.on("error", (error) => {
        throw new Error(`legacySignClient > on error: ${error}`);
    });

    legacySignClient.on("call_request", (error, payload) => {
        console.log("legacy call_request", payload);
        if (error) {
            throw new Error(`legacySignClient > call_request failed: ${error}`);
        }
        // Get required proposal data
        const { id, method, params } = payload;
        const { to, data } = params[0];
        const value = params[0].value ? convertHexToNumber(params[0].value) : 0;
        console.log("Request ID:", id);
        console.log("Method:", method);
        console.log("To Address:", to);
        console.log("Value:", value);
        console.log("CallData:", data);
        callbackTxInfo(to, value.toString(), data);
    });

    legacySignClient.on("disconnect", async () => {
        deleteCachedLegacySession();
    });
}

function getCachedLegacySession(): IWalletConnectSession | undefined {
    if (typeof window === "undefined") return;

    const local = window.localStorage ? window.localStorage.getItem("walletconnect") : null;

    let session = null;
    if (local) {
        try {
            session = JSON.parse(local);
        } catch (error) {
            throw error;
        }
    }
    return session;
}

function deleteCachedLegacySession(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("walletconnect");
}

function LegacySessionProposalModal(legacyProposal: { id: number; params: [{ chainId: number; peerId: string; peerMeta: IClientMeta }] }) {
    // Get required proposal data
    const { id, params } = legacyProposal;
    const [{ chainId, peerMeta }] = params;

    // Approve or Reject
    onApprove();

    // Hanlde approve action, construct session namespace
    function onApprove() {
        legacySignClient.approveSession({
            accounts: [account],
            chainId: 5,
        });
    }

    // Handle reject action
    function onReject() {
        legacySignClient.rejectSession(getSdkError("USER_REJECTED_METHODS"));
    }
}
