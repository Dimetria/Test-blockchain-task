import {ethers } from "ethers";

export const ChainId = {
  ETHEREUM: 1,
  BSC: 56,
  BSC_TESTNET: 97,
};

export const supportedChainIds = Object.values(ChainId).map(Number);
export const injected = new ethers.BrowserProvider(window.ethereum);
