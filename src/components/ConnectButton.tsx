import {useCallback, useEffect, useState} from "react";
import {
  Box,
  Button,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {injected, supportedChainIds} from "../config/wallets";
import {Contract, ethers} from "ethers";
import abi from "./abi.json";

declare global {
  interface Window {
    ethereum: any;
  }
}

export default function ConnectButton() {

  const active = typeof window.ethereum !== "undefined" && window.ethereum.isConnected();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [account, setAccount] = useState<string>("");
  const [chainId, setChainId] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(false);
  const [balance, setBalance] = useState<string>("0");
  const [babyBalance, setBabyBalance] = useState<string>("0");
  const [mode, setMode] = useState<string>("BNB");
  const [recieverAdd, setRecieverAdd] = useState<string>("");
  const [sendAmount, setSendAmount] = useState<number>(0);
  const [gasFee, setGasFee] = useState<string>("");
  const [gasLimit, setGasLimit] = useState<number>(0);
  const toast = useToast();

  const contractAddress = "0xc748673057861a797275CD8A068AbB95A902e8de";

  async function handleConnectWallet() {
    try {

      if (!connected) {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const isSupportedChain = await checkSupportedChain();

        if (!isSupportedChain) {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ethers.toBeHex(supportedChainIds[1]) }]
          });

        } else {
          const signer = await injected.getSigner();
          setAccount(signer.address);
          setConnected(true);
        }

      } else {
        disconnectWallet();
      }

    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  }

  async function checkSupportedChain() {
    const network = await injected.getNetwork();
    return supportedChainIds.includes(Number(network.chainId));
  }

  const disconnectWallet = () => {
    try {
      setAccount("");
      setConnected(false);
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  function handleMode() {
    setMode(mode === "BNB" ? "BabyDoge" : "BNB");
  }

  function handleChangeAddress(event: any) {
    setRecieverAdd(event.target.value);
  }

  function handleChangeAmount(event: any) {
    setSendAmount(event.target.value);
  }

  async function handleOpenModal() {

    if (!recieverAdd) {
      return toast({
        description: "Please input Receiver Address",
        status: "error",
      });
    }
    if (!sendAmount || sendAmount === 0) {
      return toast({
        description: "Please input send amount",
        status: "error",
      });
    }

    try {

      const block = await injected.getBlock("latest");
      setGasLimit(Number(block?.gasLimit));

      const feeData = await injected.getFeeData();
      const gasPrice = feeData.gasPrice;
      const gasPriceString = gasPrice?.toString();
      setGasFee(toGWei(gasPriceString));

      onOpen();

    } catch (error) {
      console.error("Error opening modal:", error);
    }

  }

  const sendBaby = useCallback(async () => {
    try {

      const signer = await injected.getSigner(account);
      const contract = new Contract(contractAddress, abi, signer);

      await contract.approve(account, ethers.parseEther(sendAmount.toString()));
      await contract.transfer(recieverAdd, ethers.parseEther(sendAmount.toString()));

    } catch (error) {
      console.error("Error sending BabyDoge:", error);
    }
  }, [account, abi, sendAmount, recieverAdd]);

  const sendAction = useCallback(async () => {

    try {
      const signer = await injected.getSigner();

      const txResponse = await signer.sendTransaction({
        to: recieverAdd,
        value: ethers.parseEther(sendAmount.toString()),
      });

      console.log(`Transaction hash: ${txResponse.hash}`);
      await txResponse.wait();

      onClose();

    } catch (error) {
      console.error("Error sending transaction:", error);
    }
  }, [account, recieverAdd, sendAmount]);

  function fromWei(val: string | null) {
    if (val) {
      const weiValue = ethers.parseUnits(val, "wei");
      return ethers.formatUnits(weiValue, "ether");
    } else {
      return "0";
    }
  }

  function toGWei(val: string | undefined) {
    if (val) {
      const weiValue = ethers.parseUnits(val, "wei");
      return ethers.formatUnits(weiValue, "gwei");
    } else {
      return "0";
    }
  }

  const valueload = useCallback(async () => {
    if(injected) {
      try {
        const signer = await injected.getSigner(account);
        const contract = new Contract(contractAddress, abi, signer);

        if (account) {
          const value = await injected.getBalance(account);
          const valueString = value.toString();
          setBalance(Number(fromWei(valueString)).toFixed(5));

          const feeData = await injected.getFeeData();
          const gasPrice = feeData.gasPrice;
          const gasPriceString = gasPrice?.toString();
          setGasFee(toGWei(gasPriceString));

          const babyValue = await contract.balanceOf(account);
          setBabyBalance(Number(fromWei(babyValue)).toFixed(5));
        }

      } catch (error) {
        console.error("Error:", error);
      }
    }
  }, [account, chainId]);


  useEffect(() => {
    active && valueload();
  }, [account, active, valueload, chainId]);

  useEffect(() => {
    if (!window.ethereum) {
      return
    }
      window.ethereum.on("chainChanged", (newChainId: any) => {
        setChainId(parseInt(newChainId, 16))
        window.location.reload()
      });

      window.ethereum.on("accountsChanged", (newAccounts: Array<string>) => {
        setAccount(newAccounts[0] || "");
      });
  }, []);


  return (
    <>
    <h1 className="title">Metamask login demo from Enva Division</h1>
      {account ? (
        <Box
          display="block"
          alignItems="center"
          background="white"
          borderRadius="xl"
          p="4"
          width="300px"
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb="2"
          >
            <Text color="#158DE8" fontWeight="medium">
              Account:
            </Text>
            <Text color="#6A6A6A" fontWeight="medium">
              {`${account.slice(0, 6)}...${account.slice(
                account.length - 4,
                account.length
              )}`}
            </Text>
          </Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb="2"
          >
            <Text color="#158DE8" fontWeight="medium">
              BabyDoge Balance :
            </Text>
            <Text color="#6A6A6A" fontWeight="medium">
              {babyBalance}
            </Text>
          </Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb="2"
          >
            <Text color="#158DE8" fontWeight="medium">
              BNB Balance:
            </Text>
            <Text color="#6A6A6A" fontWeight="medium">
              {balance}
            </Text>
          </Box>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb="2"
          >
            <Text color="#158DE8" fontWeight="medium">
              BNB / BabyDoge
            </Text>
            <Switch size="md" value={mode} onChange={handleMode} />
          </Box>
          <Box
            display="block"
            justifyContent="space-between"
            alignItems="center"
            mb="4"
          >
            <Text color="#158DE8" fontWeight="medium">
              Send {mode}:
            </Text>
            <Input
              bg="#EBEBEB"
              size="lg"
              value={recieverAdd}
              onChange={handleChangeAddress}
            />
          </Box>
          <Box display="flex" alignItems="center" mb="4">
            <Input
              bg="#EBEBEB"
              size="lg"
              value={sendAmount}
              onChange={handleChangeAmount}
            />
            <Button
              onClick={handleOpenModal}
              bg="#158DE8"
              color="white"
              fontWeight="medium"
              borderRadius="xl"
              ml="2"
              border="1px solid transparent"
              _hover={{
                borderColor: "blue.700",
                color: "gray.800",
              }}
              _active={{
                backgroundColor: "blue.800",
                borderColor: "blue.700",
              }}
            >
              Send
            </Button>
          </Box>
          <Box display="flex" justifyContent="center" alignItems="center">
            <Button
              onClick={handleConnectWallet}
              bg="#158DE8"
              color="white"
              fontWeight="medium"
              borderRadius="xl"
              border="1px solid transparent"
              width="300px"
              _hover={{
                borderColor: "blue.700",
                color: "gray.800",
              }}
              _active={{
                backgroundColor: "blue.800",
                borderColor: "blue.700",
              }}
            >
              Disconnect Wallet
            </Button>
          </Box>
          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Are you Sure?</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <div>
                  Are you sure {sendAmount} {mode} to {recieverAdd} user?
                </div>
                <div>Gas Limit: {gasLimit}</div>
                <div>Gas Price: {gasFee}</div>
              </ModalBody>
              <ModalFooter>
                <Button colorScheme="blue" mr={3} onClick={onClose}>
                  Close
                </Button>
                <Button variant="ghost" onClick={sendAction}>
                  Send
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Box>
      ) : (
        <Box bg="white" p="4" borderRadius="xl">
          <Button
            onClick={() => handleConnectWallet()}
            bg="#158DE8"
            color="white"
            fontWeight="medium"
            borderRadius="xl"
            border="1px solid transparent"
            width="300px"
            _hover={{
              borderColor: "blue.700",
              color: "gray.800",
            }}
            _active={{
              backgroundColor: "blue.800",
              borderColor: "blue.700",
            }}
          >
            Connect Wallet
          </Button>
        </Box>
      )}
    </>
  );
}
