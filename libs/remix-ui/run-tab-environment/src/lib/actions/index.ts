import { Engine, Plugin } from "@remixproject/engine"
import { Actions, Blockchain, Provider, WidgetState } from "../types"
import DeleteVmStatePrompt from "../components/deleteVMStatePrompt"
import { trackMatomoEvent } from "@remix-api"
import { IntlShape } from "react-intl"
import { ForkedStatePrompt } from "../components/forkedStatePrompt"
import { addFVSProvider } from "./providers"
import React from "react"
import { aaLocalStorageKey } from "@remix-project/remix-lib"
export * from "./providers"

export async function resetVmState (plugin: Plugin, widgetState: WidgetState, intl: IntlShape) {
  const context = widgetState.providers.selectedProvider
  const contextExists = await plugin.call('fileManager', 'exists', `.states/${context}/state.json`)

  if (contextExists) {
    plugin.call('notification', 'modal', {
      id: 'deleteVmStateModal',
      title: intl.formatMessage({ id: 'udapp.resetVmStateTitle' }),
      message: DeleteVmStatePrompt(),
      okLabel: intl.formatMessage({ id: 'udapp.reset' }),
      cancelLabel: intl.formatMessage({ id: 'udapp.cancel' }),
      okFn: async () => {
        const currentProvider = await plugin.call('blockchain', 'getCurrentProvider')
        // Reset environment blocks and account data
        await currentProvider.resetEnvironment()
        // Remove deployed and pinned contracts from UI
        await plugin.call('udapp', 'clearAllInstances')
        // Delete environment state file
        await plugin.call('fileManager', 'remove', `.states/${context}/state.json`)
        // If there are pinned contracts, delete pinned contracts folder
        const isPinnedContracts = await plugin.call('fileManager', 'exists', `.deploys/pinned-contracts/${context}`)
        if (isPinnedContracts) await plugin.call('fileManager', 'remove', `.deploys/pinned-contracts/${context}`)
        plugin.call('notification', 'toast', `VM state reset successfully.`)
        trackMatomoEvent(plugin, { category: 'udapp', action: 'deleteState', name: 'VM state reset', isClick: false })
      }
    })
  } else plugin.call('notification', 'toast', `State not available to reset, as no transactions have been made for selected environment & selected workspace.`)
}

export async function forkState (widgetState: WidgetState, plugin: Plugin & { engine: Engine, blockchain: Blockchain }, dispatch: React.Dispatch<Actions>, intl: IntlShape) {
  const provider = widgetState.providers.providerList.find(provider => provider.name === widgetState.providers.selectedProvider)
  if (!provider) {
    plugin.call('notification', 'toast', `Provider not found.`)
    return
  }
  let context = provider.name
  context = context.replace('vm-fs-', '')

  let currentStateDb
  try {
    currentStateDb = JSON.parse(await plugin.call('blockchain', 'getStateDetails'))
  } catch (e) {
    plugin.call('notification', 'toast', `State not available to fork. ${e.message}`)
    return
  }

  if (Object.keys(currentStateDb.db).length === 0) {
    plugin.call('notification', 'toast', `State not available to fork, as no transactions have been made for selected environment & selected workspace.`)
    return
  }

  const vmStateName = `${context}_${Date.now()}`
  plugin.call('notification', 'modal', {
    id: 'forkStateModal',
    title: intl.formatMessage({ id: 'udapp.forkStateTitle' }),
    message: ForkedStatePrompt(),
    modalType: 'prompt',
    okLabel: intl.formatMessage({ id: 'udapp.fork' }),
    cancelLabel: intl.formatMessage({ id: 'udapp.cancel' }),
    okFn: async (value: string) => {
      currentStateDb.stateName = value
      currentStateDb.forkName = provider.config.fork
      currentStateDb.nodeUrl = provider.config.nodeUrl
      currentStateDb.savingTimestamp = Date.now()
      await plugin.call('fileManager', 'writeFile', `.states/forked_states/${currentStateDb.stateName}.json`, JSON.stringify(currentStateDb, null, 2))
      await addFVSProvider(`.states/forked_states/${currentStateDb.stateName}.json`, 20, plugin, dispatch)
      const name = `vm-fs-${currentStateDb.stateName}`

      trackMatomoEvent(plugin, { category: 'blockchain', action: 'providerPinned', name: name, isClick: false })
      // this.emit('providersChanged')
      await plugin.call('blockchain', 'changeExecutionContext', { context: name }, null, null, null)
      plugin.call('notification', 'toast', `New environment '${currentStateDb.stateName}' created with forked state.`)

      // we also need to copy the pinned contracts:
      if (await plugin.call('fileManager', 'exists', `.deploys/pinned-contracts/${provider.name}`)) {
        const files = await plugin.call('fileManager', 'readdir', `.deploys/pinned-contracts/${provider.name}`)
        if (files && Object.keys(files).length) {
          await plugin.call('fileManager', 'copyDir', `.deploys/pinned-contracts/${provider.name}`, `.deploys/pinned-contracts`, 'vm-fs-' + currentStateDb.stateName)
        }
      }
      trackMatomoEvent(plugin, { category: 'udapp', action: 'forkState', name: `forked from ${context}`, isClick: false })
    }
  })
}

export async function setExecutionContext (provider: Provider, plugin: Plugin, widgetState: WidgetState, dispatch: React.Dispatch<Actions>) {
  if (provider.name !== widgetState.providers.selectedProvider) {
    if (provider.name === 'walletconnect') {
      await setWalletConnectExecutionContext(plugin, { context: provider.name, fork: provider.config.fork })
    } else {
      await plugin.call('blockchain', 'changeExecutionContext', { context: provider.name, fork: provider.config.fork }, null, (alertMsg) => {
        plugin.call('notification', 'toast', alertMsg)
      }, async () => {})
    }
    dispatch({ type: 'SET_CURRENT_PROVIDER', payload: provider.name })
    plugin.emit('providersChanged', provider)
  }
}

async function setWalletConnectExecutionContext (plugin: Plugin, executionContext: { context: string, fork: string }) {
  await plugin.call('walletconnect', 'openModal')
  plugin.on('walletconnect', 'connectionSuccessful', () => {
    plugin.call('blockchain', 'changeExecutionContext', executionContext, null, (alertMsg) => {
      plugin.call('notification', 'toast', alertMsg)
    }, async () => {})
  })
  plugin.on('walletconnect', 'connectionFailed', (msg) => {
    plugin.call('notification', 'toast', msg)
    cleanupWalletConnectEvents(plugin)
  })
  plugin.on('walletconnect', 'connectionDisconnected', (msg) => {
    plugin.call('notification', 'toast', msg)
    cleanupWalletConnectEvents(plugin)
  })
}

function cleanupWalletConnectEvents (plugin: Plugin) {
  plugin.off('walletconnect', 'connectionFailed')
  plugin.off('walletconnect', 'connectionDisconnected')
  plugin.off('walletconnect', 'connectionSuccessful')
}

export async function getAccountsList (plugin: Plugin & { blockchain: Blockchain }, dispatch: React.Dispatch<Actions>, widgetState: WidgetState) {
  let accounts = await plugin.call('blockchain', 'getAccounts')
  const provider = await plugin.call('blockchain', 'getProvider')
  let safeAddresses = []

  if (provider && provider.startsWith('injected') && accounts?.length) {
    await loadSmartAccounts(widgetState)
    if (widgetState.accounts.smartAccounts) {
      safeAddresses = Object.keys(widgetState.accounts.smartAccounts)
      accounts.push(...safeAddresses)
    }
  }
  if (!accounts) accounts = []

  const defaultAccounts = []
  const smartAccounts = []
  let index = 1
  for (const account of accounts) {
    const balance = await plugin.blockchain.getBalanceInEther(account)
    if (provider.startsWith('injected') && plugin.blockchain && plugin.blockchain['networkNativeCurrency'] && plugin.blockchain['networkNativeCurrency'].symbol)
      defaultAccounts.push({
        alias: `Account ${index}`,
        account: account,
        balance: balance,
        symbol: plugin.blockchain['networkNativeCurrency'].symbol
      })
    else
      defaultAccounts.push({
        alias: `Account ${index}`,
        account: account,
        balance: balance,
        symbol: plugin.blockchain['networkNativeCurrency'].symbol
      })
    if (safeAddresses.length && safeAddresses.includes(account)) smartAccounts.push({
      alias: `Account ${index}`,
      account: account,
      balance: balance
    })
    index++
  }

  dispatch({ type: 'SET_ACCOUNTS', payload: defaultAccounts })
  dispatch({ type: 'SET_SMART_ACCOUNTS', payload: smartAccounts })
}

function loadSmartAccounts (widgetState: WidgetState) {
  const { chainId } = widgetState.network
  const smartAccountsStr = localStorage.getItem(aaLocalStorageKey)

  if (smartAccountsStr) {
    const smartAccountsObj = JSON.parse(smartAccountsStr)
    if (smartAccountsObj[chainId]) {
      widgetState.accounts.smartAccounts = smartAccountsObj[chainId]
    } else {
      smartAccountsObj[chainId] = {}
      localStorage.setItem(aaLocalStorageKey, JSON.stringify(smartAccountsObj))
    }
  } else {
    const objToStore = {}
    objToStore[chainId] = {}
    localStorage.setItem(aaLocalStorageKey, JSON.stringify(objToStore))
  }
}
