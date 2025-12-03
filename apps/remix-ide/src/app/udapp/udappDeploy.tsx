import React from 'react'
import { Engine, Plugin } from '@remixproject/engine'
import { DeployWidget } from '@remix-ui/run-tab-deploy'
import type { Blockchain } from '../../blockchain/blockchain'
import type { CompilerArtefacts } from '@remix-project/core-plugin'
import { DeployWidgetState } from '@remix-ui/run-tab-deploy'
import BN from 'bn.js'

const profile = {
  name: 'udappDeploy',
  displayName: 'Udapp Deploy',
  description: 'Handles contract deployment UI and state',
  methods: ['getUI', 'getGasLimit', 'getValueUnit'],
  events: []
}

export class DeployPlugin extends Plugin {
  engine: Engine
  blockchain: Blockchain
  compilersArtefacts: CompilerArtefacts
  editor: any
  fileManager: any
  private getWidgetState: (() => DeployWidgetState) | null = null

  constructor () {
    super(profile)
  }

  setStateGetter(getter: () => DeployWidgetState) {
    this.getWidgetState = getter
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

  getUI(engine: Engine, blockchain: Blockchain, editor: any) {
    this.engine = engine
    this.blockchain = blockchain
    // this.compilersArtefacts = compilersArtefacts
    this.editor = editor
    // this.fileManager = fileManager
    return <DeployWidget plugin={this} />
  }
}

