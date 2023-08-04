import { useEffect, useState } from "react";
import { Abi, AbiFunction } from "abitype";
import { Address, TransactionReceipt, toHex } from "viem";
import { keccak256 } from "viem";
import { useContractWrite, useNetwork, usePrepareContractWrite, useWaitForTransaction } from "wagmi";
import {
  CodeMirrorInput,
  ContractInput,
  IntegerInput,
  TxReceipt,
  getFunctionInputKey,
  getInitialFormState,
  getParsedContractFunctionArgs,
  getParsedError,
} from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { getTargetNetwork, notification } from "~~/utils/scaffold-eth";

const Functions_1 = require("./FunctionsSandboxLibrary/Functions");

type WriteOnlyFunctionFormProps = {
  abiFunction: AbiFunction;
  onChange: () => void;
  contractAddress: Address;
};

export const WriteOnlyFunctionForm = ({ abiFunction, onChange, contractAddress }: WriteOnlyFunctionFormProps) => {
  const [form, setForm] = useState<Record<string, any>>(() => getInitialFormState(abiFunction));
  const [txValue, setTxValue] = useState<string | bigint>("");
  const { chain } = useNetwork();
  const writeDisabled = !chain || chain?.id !== getTargetNetwork().id;
  const { data: mockOracleContractInfo } = useDeployedContractInfo("MockChainlinkOracle");
  const [isExecuteMock, setIsExecuteMock] = useState(false);
  const [requestArgs, setRequestArgs] = useState([]);
  const [codeString, setCodeString] = useState("");
  const writeTxn = useTransactor();
  const [fullfilRequestArgs, setFullfilRequestArgs] = useState(Array<string>);

  const { config: mockFullfilRequestConfig } = usePrepareContractWrite({
    address: mockOracleContractInfo?.address,
    abi: mockOracleContractInfo?.abi,
    functionName: "mockHandleFulfillRequest",
    args: [...fullfilRequestArgs] as unknown as readonly [`0x${string}`, `0x${string}`, `0x${string}`],
  });

  const {
    data: resultFulfillWrite,
    isLoading: isLoadingFulfillWrite,
    writeAsync: executeMockFulfillWrite,
  } = useContractWrite(mockFullfilRequestConfig);
  const {
    data: result,
    isLoading,
    writeAsync,
  } = useContractWrite({
    chainId: getTargetNetwork().id,
    address: contractAddress,
    functionName: abiFunction.name,
    abi: [abiFunction] as Abi,
    args: getParsedContractFunctionArgs(form),
  });
  const handleFulfillRequest = async () => {
    if (executeMockFulfillWrite) {
      console.log("config", mockFullfilRequestConfig);
      const makeWriteWithParams = () => executeMockFulfillWrite();
      await writeTxn(makeWriteWithParams);
      onChange();
    }
  };

  useEffect(() => {
    if (isExecuteMock) {
      handleFulfillRequest();
      setIsExecuteMock(false);
    }
  }, [isExecuteMock]);

  const handleWrite = async () => {
    if (abiFunction.name == "executeRequest") {
      const inputArgs = getParsedContractFunctionArgs(form);
      setRequestArgs(inputArgs[2]);
      const result = chainlinkFunction();
      try {
        if (chain?.id == 31337) {
          const requestArgs = [...getParsedContractFunctionArgs(form)];
          requestArgs[0] = codeString;
          requestArgs[2] = requestArgs[2] || [];
          requestArgs[3] = 1;
          requestArgs[4] = 300000;

          console.log(result);
          const args = [keccak256("0xSample"), toHex(result), ""];
          setFullfilRequestArgs(args);
          setIsExecuteMock(true);
        } else {
        }
      } catch (e) {
        console.log("error", e);
      }
    } else {
      if (writeAsync) {
        try {
          const makeWriteWithParams = () => writeAsync({ value: BigInt(txValue) });
          await writeTxn(makeWriteWithParams);
          onChange();
        } catch (e: any) {
          const message = getParsedError(e);
          notification.error(message);
        }
      }
    }
  };

  //Functions module
  const functionsModule = new Functions_1.FunctionsModule();
  const Functions = functionsModule.buildFunctionsmodule();

  //function global module
  const allGlobals = {
    Functions,
    args: !requestArgs ? [] : [...requestArgs],
  };
  //execute chanlink function
  const chainlinkFunction = () => {
    const globalsValues = Object.values(allGlobals);
    const allGlobalKeys = Object.keys(allGlobals).join(", ");
    if (codeString) {
      const newCode = `(function execCode(${allGlobalKeys}){
    ${codeString}\n
  })`;
      const result = eval(newCode).apply(this, globalsValues);
      return result;
    }
  };
  const [displayedTxResult, setDisplayedTxResult] = useState<TransactionReceipt>();
  const { data: txResult } = useWaitForTransaction({
    hash: result?.hash,
  });

  const { data: txResultFulfillWrite } = useWaitForTransaction({
    hash: resultFulfillWrite?.hash,
  });

  useEffect(() => {
    setDisplayedTxResult(txResult);
  }, [txResult]);

  useEffect(() => {
    setDisplayedTxResult(txResultFulfillWrite);
  }, [txResultFulfillWrite]);

  // TODO use `useMemo` to optimize also update in ReadOnlyFunctionForm
  const inputs = abiFunction.inputs.map((input, inputIndex) => {
    const key = getFunctionInputKey(abiFunction.name, input, inputIndex);
    return (
      <ContractInput
        key={key}
        setForm={updatedFormValue => {
          setDisplayedTxResult(undefined);
          setForm(updatedFormValue);
        }}
        form={form}
        stateObjectKey={key}
        paramType={input}
      />
    );
  });
  const zeroInputs = inputs.length === 0 && abiFunction.stateMutability !== "payable";

  return (
    <div className="py-5 space-y-3 first:pt-0 last:pb-1">
      <div className={`flex gap-3 ${zeroInputs ? "flex-row justify-between items-center" : "flex-col"}`}>
        <p className="font-medium my-0 break-words">{abiFunction.name}</p>
        {abiFunction.name == "executeRequest" ? (
          <div className="bg-[#282c34] rounded-md">
            <div className="text-xs  text-white p-2">Javscript Code</div>
            <CodeMirrorInput codeString={codeString} onChange={e => setCodeString(e)}></CodeMirrorInput>
          </div>
        ) : (
          ""
        )}
        {inputs}
        {abiFunction.stateMutability === "payable" ? (
          <IntegerInput
            value={txValue}
            onChange={updatedTxValue => {
              setDisplayedTxResult(undefined);
              setTxValue(updatedTxValue);
            }}
            placeholder="value (wei)"
          />
        ) : null}
        <div className="flex justify-between gap-2">
          {!zeroInputs && (
            <div className="flex-grow basis-0">
              {displayedTxResult ? <TxReceipt txResult={displayedTxResult} /> : null}
            </div>
          )}
          <div
            className={`flex ${
              writeDisabled &&
              "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
            }`}
            data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
          >
            <button
              className={`btn btn-secondary btn-sm ${isLoading || isLoadingFulfillWrite ? "loading" : ""}`}
              disabled={writeDisabled}
              onClick={handleWrite}
            >
              Send 💸
            </button>
          </div>
        </div>
      </div>
      {zeroInputs && txResult ? (
        <div className="flex-grow basis-0">
          <TxReceipt txResult={txResult} />
        </div>
      ) : null}
    </div>
  );
};
