import React from 'react'
import { AddressToggle, CustomMenu, CustomToggle, EnvironmentToggle } from '@remix-ui/helper'
import { Engine, Plugin } from '@remixproject/engine'
import { Dropdown } from 'react-bootstrap'
import { EnvironmentWidget } from '@remix-ui/run-tab-environment'
import type { Blockchain } from '../../blockchain/blockchain'

const profile = {
  name: 'udappEnv',
  displayName: 'Udapp Environment',
  description: 'Maintains the schema for deployment and execution environment',
  methods: ['getUI'],
  events: []
}

export class EnvironmentPlugin extends Plugin {
  engine: Engine
  blockchain: Blockchain
  constructor () {
    super(profile)
  }

  getUI(engine: Engine, blockchain: Blockchain) {
    this.engine = engine
    this.blockchain = blockchain
    return <EnvironmentWidget plugin={this} />
  }
}
