import React from 'react'
import { AddressToggle, CustomMenu, CustomToggle, EnvironmentToggle } from '@remix-ui/helper'
import { Engine, Plugin } from '@remixproject/engine'
import { Dropdown } from 'react-bootstrap'
import { EnvironmentWidget } from '@remix-ui/run-tab-environment'
import type { Blockchain } from '../../blockchain/blockchain'
import { WidgetState, Account } from '@remix-ui/run-tab-environment'

const profile = {
  name: 'udappEnv',
  displayName: 'Udapp Environment',
  description: 'Maintains the schema for deployment and execution environment',
  methods: ['getUI', 'getSelectedAccount', 'isSmartAccount', 'getDefaultProvider'],
  events: []
}

export class EnvironmentPlugin extends Plugin {
  engine: Engine
  blockchain: Blockchain
  private getWidgetState: (() => WidgetState) | null = null

  constructor () {
    super(profile)
  }

  setStateGetter(getter: () => WidgetState) {
    this.getWidgetState = getter
  }

  getSelectedAccount () {
    const state = this.getWidgetState?.()
    return state?.accounts?.selectedAccount || state?.accounts?.defaultAccounts[0]?.account
  }

  isSmartAccount (address: string) {
    const state = this.getWidgetState?.()
    const smartAccounts = state?.accounts?.smartAccounts || []
    if (Array.isArray(smartAccounts)) {
      return smartAccounts.some((account: Account) => account.account === address)
    }
    return false
  }

  getDefaultProvider () {
    const state = this.getWidgetState?.()

    return state?.providers?.defaultProvider
  }

  getUI(engine: Engine, blockchain: Blockchain) {
    this.engine = engine
    this.blockchain = blockchain
    return <EnvironmentWidget plugin={this} />
  }
}
