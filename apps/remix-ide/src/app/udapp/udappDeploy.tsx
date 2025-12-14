import React from 'react'
import { Engine, Plugin } from '@remixproject/engine'
import { DeployWidget } from '@remix-ui/run-tab-deploy'
import type { Blockchain } from '../../blockchain/blockchain'
import type { CompilerArtefacts } from '@remix-project/core-plugin'
import { DeployWidgetState, Actions, GasEstimationPrompt, MainnetPrompt, DeployUdappTx, DeployUdappNetwork } from '@remix-ui/run-tab-deploy'
import BN from 'bn.js'

const profile = {
  name: 'udappDeploy',
  displayName: 'Udapp Deploy',
  description: 'Handles contract deployment UI and state',
  methods: ['getUI', 'getGasLimit', 'getValueUnit', 'setGasPriceStatus', 'setConfirmSettings', 'getMaxFee', 'getMaxPriorityFee', 'setMaxPriorityFee', 'setGasPrice', 'getBaseFeePerGas', 'getGasPrice', 'getConfirmSettings'],
  events: []
}

export class DeployPlugin extends Plugin {
  engine: Engine
  blockchain: Blockchain
  compilersArtefacts: CompilerArtefacts
  editor: any
  fileManager: any
  private getWidgetState: (() => DeployWidgetState) | null = null
  private getDispatch: (() => React.Dispatch<Actions>) | null = null
  constructor () {
    super(profile)
  }

  setStateGetter(getter: () => DeployWidgetState) {
    this.getWidgetState = getter
  }

  setDispatchGetter(getter: () => React.Dispatch<Actions>) {
    this.getDispatch = getter
  }

  getGasLimit(): string {
    return '0x' + new BN( this.getWidgetState()?.gasLimit, 10).toString(16)
  }

  async getValue(): Promise<number> {
    const web3 = await this.call('blockchain', 'web3')

    return web3.utils.toWei(this.getWidgetState()?.value, this.getWidgetState()?.valueUnit)
  }

  getValueUnit(): 'wei' | 'gwei' | 'finney' | 'ether' {
    return this.getWidgetState()?.valueUnit
  }

  getMaxFee(): string {
    return this.getWidgetState()?.maxFee
  }

  getMaxPriorityFee(): string {
    return this.getWidgetState()?.maxPriorityFee
  }

  getBaseFeePerGas(): string {
    return this.getWidgetState()?.baseFeePerGas
  }

  getGasPrice(): string {
    return this.getWidgetState()?.gasPrice
  }

  getConfirmSettings(): boolean {
    return this.getWidgetState()?.confirmSettings
  }

  getGasEstimationPrompt(msg: string): React.ReactElement {
    return <GasEstimationPrompt msg={msg} />
  }

  getMainnetPrompt(tx: DeployUdappTx, network: DeployUdappNetwork, amount: string, gasEstimation: string): React.ReactElement {
    return <MainnetPrompt udappDeploy={this} tx={tx} network={network} amount={amount} gasEstimation={gasEstimation} />
  }

  setGasPriceStatus(status: boolean) {
    this.getDispatch()({ type: 'SET_GAS_PRICE_STATUS', payload: status })
  }

  setConfirmSettings(confirmation: boolean) {
    this.getDispatch()({ type: 'SET_CONFIRM_SETTINGS', payload: confirmation })
  }

  setMaxPriorityFee(fee: string) {
    this.getDispatch()({ type: 'SET_MAX_PRIORITY_FEE', payload: fee })
  }

  setGasPrice(price: string) {
    this.getDispatch()({ type: 'SET_GAS_PRICE', payload: price })
  }

  setMaxFee(fee: string) {
    this.getDispatch()({ type: 'SET_MAX_FEE', payload: fee })
  }

  getUI(engine: Engine, blockchain: Blockchain, editor: any) {
    this.engine = engine
    this.blockchain = blockchain
    // this.compilersArtefacts = compilersArtefacts
    this.editor = editor
    // this.fileManager = fileManager
    return <DeployWidget plugin={this} />
  }
}

