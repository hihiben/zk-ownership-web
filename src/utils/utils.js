import { BigNumber, Signer, ethers } from "ethers";

export const bigNumberToBigIntArray = (n, k, x) => {
    // bigendian
    let mod = BigNumber.from(1);
    const two = BigNumber.from(2);

    for (let idx = 0; idx < n; idx++) {
        mod = mod.mul(two);
    }

    const ret = [];
    let xTemp = x;
    for (let idx = 0; idx < k; idx++) {
        ret.push(xTemp.mod(mod).toBigInt());
        xTemp = xTemp.div(mod);
    }
    return ret;
};

export const formatProofForVerifierContract = (_proof) => {
    return [_proof.pi_a[0], _proof.pi_a[1], _proof.pi_b[0][1], _proof.pi_b[0][0], _proof.pi_b[1][1], _proof.pi_b[1][0], _proof.pi_c[0], _proof.pi_c[1]];
};

export const simpleEncode = (_func, params) => {
    const func = "function " + _func;
    const abi = [func];
    const iface = new ethers.utils.Interface(abi);
    const data = iface.encodeFunctionData(_func, params);

    return data;
};
