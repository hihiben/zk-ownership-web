import { SessionTypes, SignClientTypes } from "@walletconnect/types";
import { getSdkError } from "@walletconnect/utils";
import { signClient, account } from "./wcSetup";

export function wcSessionProposalModal(proposal: SignClientTypes.EventArguments["session_proposal"]) {
    // Get required proposal data
    const { id, params } = proposal;
    const { proposer, requiredNamespaces, relays } = params;

    // Approve or Reject
    onApprove();

    // Handle approve action, construct session namespace
    async function onApprove() {
        if (proposal) {
            console.log("approving with id:", id);

            // Prepare namespaces
            const namespaces: SessionTypes.Namespaces = {};
            Object.keys(requiredNamespaces).forEach((key) => {
                namespaces[key] = {
                    accounts: ["eip155:5:" + account],
                    methods: requiredNamespaces[key].methods,
                    events: requiredNamespaces[key].events,
                };
            });

            // Approve
            const { acknowledged } = await signClient.approve({
                id,
                relayProtocol: relays[0].protocol,
                namespaces,
            });
            console.log("approved");

            // Acknowledged
            const session = await acknowledged();
            console.log(session);
        }
    }

    // Hanlde reject action
    async function onReject() {
        if (proposal) {
            await signClient.reject({
                id,
                reason: getSdkError("USER_REJECTED_METHODS"),
            });
        }
    }
}
