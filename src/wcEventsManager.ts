import { signClient } from "./wcSetup";
import { wcSessionProposalModal } from "./wcSessionProposalModal";
import { wcSessionRequestModal } from "./wcSessionRequestModal";

export function useWalletConnectEventsManager() {
    /******************************************************************************
     * 1. Open session proposal modal for confirmation / rejection
     *****************************************************************************/
    signClient.on("session_proposal", (event) => {
        // Show session proposal data to the user i.e. in a modal with options to approve / reject it
        console.log("session_proposal", event);
        wcSessionProposalModal(event);
    });

    /******************************************************************************
     * 2. Open request handling modal based on method that was used
     *****************************************************************************/
    signClient.on("session_request", (event) => {
        // Handle session method requests, such as "eth_sign", "eth_sendTransaction", etc.
        console.log("session_request", event);
        wcSessionRequestModal(event);
    });
}
