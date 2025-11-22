import React from 'react'
import { Engine, Plugin } from '@remixproject/engine'
import { DeployWidget } from '@remix-ui/run-tab-deploy'
import type { Blockchain } from '../../blockchain/blockchain'
import type { CompilerArtefacts } from '@remix-project/core-plugin'
import { DeployWidgetState } from '@remix-ui/run-tab-deploy'

const profile = {
  name: 'udappDeploy',
  displayName: 'Udapp Deploy',
  description: 'Handles contract deployment UI and state',
  methods: ['getUI', 'getSelectedContract', 'getDeployState'],
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

  getSelectedContract () {
    const state = this.getWidgetState?.()
    return state?.contracts.selectedContract || null
  }

  getUI(engine: Engine, blockchain: Blockchain, compilersArtefacts: CompilerArtefacts, editor: any, fileManager: any) {
    this.engine = engine
    this.blockchain = blockchain
    this.compilersArtefacts = compilersArtefacts
    this.editor = editor
    this.fileManager = fileManager
    return <DeployWidget plugin={this} />
  }
}

