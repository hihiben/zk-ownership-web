import SignClient from "@walletconnect/sign-client";
import { useWalletConnectEventsManager } from "./wcEventsManager";
import { createLegacySignClient } from "./wcLegacySignClient";
import { parseUri } from "@walletconnect/utils";

export let signClient: SignClient;
export let callbackTxInfo: (to: string, value: string, callData: string) => {};
export let account: string;

export async function wcSetup(accountAddress: string, callback: (to: string, value: string, callData: string) => {}) {
    // Setup the index update tx info callback function
    console.log("account: ", accountAddress);
    account = accountAddress;
    callbackTxInfo = callback;

    // Step 1 - Initialize wallet connect client
    console.log("createSignClient...");
    await createSignClient();
    console.log("createSignClient done!");

    // Step 2 - Once initialized, set up wallet connect event manager
    console.log("subscribe the wallet connect events...");
    useWalletConnectEventsManager();
    console.log("subscribe done!");

    // Backwards compatibility only - create a legacy v1 SignClient instance.
    createLegacySignClient();
}

export async function createSignClient() {
    // createSignClient
    signClient = await SignClient.init({
        projectId: "fb9f19a75575e2efc2f0c74dd07e7c76",
        metadata: {
            name: "ZK Ownership",
            description: "ZK Ownership",
            url: "https://walletconnect.com/",
            icons: ["https://avatars.githubusercontent.com/u/37784886"],
        },
    });
}

export async function onConnect(uri: string) {
    try {
        const { version } = parseUri(uri);

        // Route the provided URI to the v1 SignClient if URI version indicates it, else use v2.
        if (version === 1) {
            console.log("version 1 wallet connect, try pair uri:", uri);
            createLegacySignClient({ uri });
        } else {
            console.log("version 2 wallet connect, try pair uri:", uri);
            await signClient.pair({ uri });
        }
    } catch (err: unknown) {
        alert(err);
    }
}
