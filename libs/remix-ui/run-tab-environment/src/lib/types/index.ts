import { Engine, Plugin } from "@remixproject/engine"
import { Dispatch } from 'react'
import { EventEmitter } from "events"

export interface EnvironmentAppContext {
  plugin: Plugin & { engine: Engine, blockchain: Blockchain }
  widgetState: WidgetState
  dispatch: Dispatch<Actions>
}

export interface IEnvWidgetContext {
  widgetState: WidgetState
  dispatch: Dispatch<Actions>,
  plugin: Plugin
}

export interface WidgetState {
  providers: {
    defaultProvider: string,
    selectedProvider: string,
    providerList: Provider[],
    isRequesting: boolean,
    isSuccessful: boolean,
    error: string
  }
}

export interface ActionPayloadTypes {
  SET_CURRENT_PROVIDER: string,
  ADD_PROVIDER: Provider,
  REMOVE_PROVIDER: Provider
}
export interface Action<T extends keyof ActionPayloadTypes> {
  type: T
  payload: ActionPayloadTypes[T]
}

export type Actions = {[A in keyof ActionPayloadTypes]: Action<A>}[keyof ActionPayloadTypes]

export type ProviderConfig = {
    isVM: boolean
    isInjected: boolean
    isRpcForkedState?: boolean
    isVMStateForked?: boolean
    fork: string
    statePath?: string,
    blockNumber?: string
    nodeUrl?: string
    baseBlockNumber?: string
  }

export type Provider = {
    position: number,
    category: string,
    options: { [key: string]: string }
    dataId: string
    name: string
    displayName: string
    logo?: string,
    logos?: string[],
    description?: string
    config: ProviderConfig
    title: string
    init: () => Promise<void>
    provider:{
      sendAsync: (payload: any) => Promise<void>
      udapp?: Plugin
    }
  }

export type ProviderDetails = {
    position: number,
    name: string,
    displayName: string,
    providerConfig?: ProviderConfig,
    dataId?: string,
    title?: string
    event?: ProviderDetailsEvent,
    networkId?: string,
    urls?: string[],
    nativeCurrency?: { name: string, symbol: string, decimals: number }
    category?: string
}

export type ProviderDetailsEvent = {
  detail: {
    info: {
      name: string
    }
    provider: Provider
  }
}

export interface Blockchain extends Plugin<any, any> {
  event: any;
  executionContext: ExecutionContext;
  events: EventEmitter;
  config: any;
  txRunner: any;
  networkcallid: number;
  networkStatus: {
        network: {
            name: string;
            id: string;
        };
    };
  setupEvents(): void;
  getCurrentNetworkStatus(): {
        network?: {
            name: string;
            id: string;
        };
        error?: string;
    };
  setupProviders(): void;
  providers: any;
  defaultPinnedProviders: string[];
  getCurrentProvider(): any;
  /** Return the list of accounts */
  getAccounts(cb?: any): any;
  deployContractAndLibraries(selectedContract: any, args: any, contractMetadata: any, compilerContracts: any, callbacks: any, confirmationCb: any): void;
  deployContractWithLibrary(selectedContract: any, args: any, contractMetadata: any, compilerContracts: any, callbacks: any, confirmationCb: any): void;
  createContract(selectedContract: any, data: any, continueCb: any, promptCb: any, confirmationCb: any, finalCb: any): void;
  determineGasPrice(cb: any): void;
  getInputs(funABI: any): any;
  fromWei(value: any, doTypeConversion: any, unit: any): string;
  toWei(value: any, unit: any): string;
  calculateFee(gas: any, gasPrice: any, unit: any): bigint;
  determineGasFees(tx: any): (gasPrice: any, cb: any) => void;
  changeExecutionContext(context: any, confirmCb: any, infoCb: any, cb: any): Promise<any>;
  detectNetwork(cb: any): void;
  getProvider(): any;
  /**
     * return the fork name applied to the current environment
     * @return {String} - fork name
     */
  getCurrentFork(): string;
  signMessage(message: any, account: any, passphrase: any, cb: any): void;
  web3(): any;
  getTxListener(opts: any): any;
  runOrCallContractMethod(contractName: any, contractAbi: any, funABI: any, contract: any, value: any, address: any, callType: any, lookupOnly: any, logMsg: any, logCallback: any, outputCb: any, confirmationCb: any, continueCb: any, promptCb: any): void;
  context(): "memory" | "blockchain";
  resetAndInit(config: any, transactionContextAPI: any): void;
  transactionContextAPI: any;
  addProvider(provider: any): void;
  removeProvider(name: any): void;
  /** Listen on New Transaction. (Cannot be done inside constructor because txlistener doesn't exist yet) */
  startListening(txlistener: any): void;
  /**
     * Create a VM Account
     * @param {{privateKey: string, balance: string}} newAccount The new account to create
     */
  createVMAccount(newAccount: {
        privateKey: string;
        balance: string;
    }): any;
  newAccount(_password: any, passwordPromptCb: any, cb: any): any;
  /** Get the balance of an address, and convert wei to ether */
  getBalanceInEther(address: any): Promise<string>;
  pendingTransactionsCount(): number;
  /**
     * This function send a tx only to Remix VM or testnet, will return an error for the mainnet
     * SHOULD BE TAKEN CAREFULLY!
     *
     * @param {Object} tx    - transaction.
     */
  sendTransaction(tx: any): any;
  runTx(args: any, confirmationCb: any, continueCb: any, promptCb: any, cb: any): void;
}

export interface ExecutionContext {
  event: any;
  executionContext: any;
  lastBlock: any;
  blockGasLimitDefault: number;
  blockGasLimit: number;
  currentFork: string;
  mainNetGenesisHash: string;
  customNetWorks: any;
  blocks: any;
  latestBlockNumber: number;
  txs: any;
  customWeb3: any;
  init(config: any): void;
  getProvider(): any;
  getCurrentFork(): string;
  isVM(): boolean;
  setWeb3(context: any, web3: any): void;
  web3(): any;
  detectNetwork(callback: any): void;
  removeProvider(name: any): void;
  addProvider(network: any): void;
  internalWeb3(): any;
  setContext(context: any, endPointUrl: any, confirmCb: any, infoCb: any): void;
  executionContextChange(value: any, endPointUrl: any, confirmCb: any, infoCb: any, cb: any): Promise<any>;
  currentblockGasLimit(): number;
  stopListenOnLastBlock(): void;
  // eslint-disable-next-line no-undef
  listenOnLastBlockId: NodeJS.Timer;
  _updateChainContext(): Promise<boolean>;
  listenOnLastBlock(): void;
  txDetailsLink(network: any, hash: any): any;
  getStateDetails(): Promise<string>
}
