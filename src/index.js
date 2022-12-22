import path from "path";
import { ethers, Wallet, BigNumber } from "ethers";
import { buildBabyjub, buildEddsa, buildMimc7 } from "circomlibjs";
import { groth16 } from "snarkjs";
import { bigNumberToBigIntArray, formatProofForVerifierContract, simpleEncode } from "./utils/utils";
import { wcSetup, onConnect } from "./wcSetup";

// Global configuation
const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
let accounts;
let owner;
const vaultObject = {};
let vault = {};
let vaults = [];
let relayer;
let verifier;
let zkOwnership;
let factory;
let eddsa;
let mimc7;
let babyJub;
let F;
const factoryAddress = "0x474D483F436eA2Fb40B478c00fc36C1cB6173CA4";
const factoryAbi = ["function deploy(bytes32 salt_, address verifier_, uint256 pubkeyX_, uint256 pubkeyY_) external payable returns (address deployed)", "function getDeployed(address deployer, bytes32 salt) external view returns (address deployed)"];
const verifierAddress = "0x9814336BC9a47d6b8e424196Ce16E5415d46C335";
const vaultAbi = ["function execWithProof(uint256[8] memory proof_, address to_, bytes calldata execData_, uint256 value_) external payable", "function setPubkey(uint256 newPubkeyX_, uint256 newPubkeyY_) external payable", "function nonce() view returns (uint256)"];
const relayerKey = process.env.RELAYER_KEY;
const circuitName = "ownership_eddsa_mimc";
const buildPath = "circom";
const n = 64;
const k = 4;

// States
let walletConnected = false;

// Wallet information
const connectWalletButton = document.getElementById("connect-wallet");
const addressValue = document.getElementById("address-value");

// Vault information
const vaultSel = document.getElementById("vault-select");
const vaultAddress = document.getElementById("vault-address");
const vaultSalt = document.getElementById("vault-salt");
const vaultPubKeyX = document.getElementById("vault-pubkeyx");
const vaultPubKeyY = document.getElementById("vault-pubkeyy");
const vaultNonce = document.getElementById("vault-nonce");

// Vault setup
const createVaultButton = document.getElementById("create-vault");
const importVaultButton = document.getElementById("import-vault");
const saltUsed = document.getElementById("salt-used");
const vaultDeployed = document.getElementById("vault-deployed");
const saltInput = document.getElementById("salt-imported");

// Tx execution
const txExecutionButton = document.getElementById("tx-execution");
const txAddressInput = document.getElementById("tx-address");
const txValueInput = document.getElementById("tx-value");
const txCalldataInput = document.getElementById("tx-calldata");
const txStatus = document.getElementById("tx-status");

// External dapp Setup
const wcUriInput = document.getElementById("wc-uri");
const wcConnectButton = document.getElementById("wc-connect");

// Blockchain
const checkChain = async (chainId) => {
    if (chainId !== 5) {
        alert("Switch to Goerli");
    }
};

window.onload = async function () {
    relayer = new Wallet(relayerKey, provider);
    factory = new ethers.Contract(factoryAddress, factoryAbi, relayer);
    babyJub = await buildBabyjub();
    eddsa = await buildEddsa();
    mimc7 = await buildMimc7();
    F = babyJub.F;
};

const updateFields = () => {
    createVaultButton.disabled = !walletConnected;
    saltInput.disabled = !walletConnected;
    importVaultButton.disabled = !(walletConnected && saltInput.value);
    txAddressInput.disabled = !vault.key;
    txValueInput.disabled = !vault.key;
    txCalldataInput.disabled = !vault.key;
    txExecutionButton.disabled = !(txAddressInput.value && txValueInput.value && txCalldataInput.value);
    wcUriInput.disabled = !vault.key;
    wcConnectButton.disabled = !vault.key;
};

const setAccounts = (acc) => {
    accounts = acc;
    addressValue.innerHTML = accounts.length ? accounts[0] : "";
    owner = provider.getSigner(0);
};

connectWalletButton.onclick = async () => {
    try {
        accounts = await provider.send("eth_requestAccounts", []);
        setAccounts(accounts);
        const network = await provider.getNetwork();
        checkChain(network.chainId);
        walletConnected = true;

        updateFields();
    } catch (e) {
        console.log("No web3 provider available", e);
    }
};

window.ethereum.on("accountsChanged", setAccounts);
window.ethereum.on("chainChanged", (chainId) => {
    checkChain(parseInt(chainId, 16));
});

// Vault
const setVault = async (index) => {
    vault = vaults[index];
    const ownedVault = new ethers.Contract(vault.address, vaultAbi, relayer);
    vaultAddress.innerHTML = vault.address;
    vaultSalt.innerHTML = ethers.utils.hexlify(vault.salt);
    vaultPubKeyX.innerHTML = vault.pubKeyX;
    vaultPubKeyY.innerHTML = vault.pubKeyY;
    vaultNonce.innerHTML = await ownedVault.nonce();
};

vaultSel.onchange = () => {
    try {
        setVault(vaultSel.value);
        updateFields();
    } catch (e) {
        console.log(e);
    }
};

// Should change to getDeployed afterwards
const getAddress = async (salt) => {
    const deployedAddress = await factory.getDeployed(relayer.address, salt);
    return deployedAddress;
};

const getVault = async (salt) => {
    let vaultTemp = Object.create(vaultObject);
    vaultTemp.salt = salt;
    vaultTemp.address = await getAddress(vaultTemp.salt);
    vaultTemp.key = await owner.signMessage(vaultTemp.address);
    const pubKey = eddsa.prv2pub(vaultTemp.key);
    vaultTemp.pubKeyX = F.toObject(pubKey[0]);
    vaultTemp.pubKeyY = F.toObject(pubKey[1]);
    return vaultTemp;
};

const generateProof = async (msg) => {
    const msgHashArray = bigNumberToBigIntArray(n, k, BigNumber.from(msg));
    const hash = mimc7.multiHash.bind(mimc7)(msgHashArray);
    const sig = eddsa.signMiMC(vault.key, hash);
    const inputs = {
        pubKeyX: vault.pubKeyX,
        pubKeyY: vault.pubKeyY,
        R8x: F.toObject(sig.R8[0]),
        R8y: F.toObject(sig.R8[1]),
        S: sig.S,
        message: msgHashArray,
    };

    const circuitWasmPath = path.join(__dirname, buildPath, `${circuitName}.wasm`);
    const zkeyPath = path.join(__dirname, buildPath, `${circuitName}.zkey`);
    return await groth16.fullProve(inputs, circuitWasmPath, zkeyPath);
};

createVaultButton.onclick = async () => {
    try {
        let salt = ethers.utils.randomBytes(32);
        saltUsed.innerHTML = ethers.utils.hexlify(salt);
        let vaultCreated = await getVault(salt);
        vaultDeployed.innerHTML = "Vault creating ...";
        const tx = await factory.deploy(salt, verifierAddress, vaultCreated.pubKeyX, vaultCreated.pubKeyY);
        let deployedVault;
        const result = await tx.wait();
        vaultDeployed.innerHTML = "Vault created at " + vaultCreated.address;
        // update list
        vaultSel.options[vaultSel.options.length] = new Option(vaultCreated.address, vaults.length, true);
        vaults.push(vaultCreated);
        updateFields();
    } catch (e) {
        console.log("No web3 provider available", e);
    }
};

saltInput.onchange = updateFields;

importVaultButton.onclick = async () => {
    try {
        let salt = ethers.utils.arrayify(saltInput.value);
        let vaultImported = await getVault(salt);
        // update list
        var vaultSel = document.getElementById("vault-select");
        vaultSel.options[vaultSel.options.length] = new Option(vaultImported.address, vaults.length);
        vaults.push(vaultImported);
        updateFields();
    } catch (e) {
        console.log("No web3 provider available", e);
    }
};

txAddressInput.onchange = updateFields;
txValueInput.onchange = updateFields;
txCalldataInput.onchange = updateFields;

txExecutionButton.onclick = async () => {
    try {
        const ownedVault = new ethers.Contract(vault.address, vaultAbi, relayer);
        const to = txAddressInput.value;
        const value = ethers.utils.parseUnits(txValueInput.value, "ether");
        const nonce = await ownedVault.nonce();
        const execData = txCalldataInput.value;
        const msg = ethers.utils.solidityKeccak256(["uint256", "address", "bytes", "uint256"], [nonce, to, execData, value]);
        txStatus.innerHTML = "Proof generating ...";
        const { proof } = await generateProof(msg);
        console.log(proof);
        txStatus.innerHTML = "Proof generated! Tx executing";
        const tx = await ownedVault.execWithProof(formatProofForVerifierContract(proof), to, execData, value);
        const result = await tx.wait();
        const txHash = result.transactionHash;
        const txLink = "https://goerli.etherscan.io/tx/" + txHash;
        txStatus.innerHTML = "<span>Tx executed! <a href = '" + txLink + "' target = '_blank'>" + txHash + "</a></span>";
        vaultNonce.innerHTML = await ownedVault.nonce();
        console.log(result);
        updateFields();
    } catch (e) {
        console.log(e);
    }
};

wcConnectButton.onclick = async () => {
    try {
        const wcUri = wcUriInput.value;
        if (wcUri) {
            await wcSetup(vault.address, updateTxInfo);
            await onConnect(wcUri);
        }
    } catch (e) {
        console.log(e);
    }
};

function updateTxInfo(to, value, calldata) {
    txAddressInput.value = to;
    txValueInput.value = value;
    txCalldataInput.value = calldata;
    updateFields();
}
