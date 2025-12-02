import React, { useEffect, useReducer } from 'react'
import { DeployAppContext } from './contexts'
import { deployInitialState, deployReducer } from './reducers'
import DeployPortraitView from './widgets/deployPortraitView'
import { Plugin, Engine } from '@remixproject/engine'
import { DeployWidgetState } from './types'
import { broadcastCompilationResult } from './actions'

function DeployWidget({ plugin }: { plugin: Plugin & { engine: Engine, editor: any, setStateGetter?: (getter: () => DeployWidgetState) => void } }) {
  const [widgetState, dispatch] = useReducer(deployReducer, deployInitialState)

  useEffect(() => {
    if (plugin.setStateGetter) {
      plugin.setStateGetter(() => widgetState)
    }
  }, [plugin, widgetState])

  useEffect(() => {
    plugin.on('fileManager', 'currentFileChanged', async (filePath: string) => {
      if (filePath && filePath.endsWith('.sol')) {
        const contract: string = await plugin.call('fileManager', 'readFile', filePath)

        if (contract) {
          let contractName = null
          const match = contract.match(/contract\s+([A-Za-z_][A-Za-z0-9_]*)/)
          if (match) {
            contractName = match[1]
          }
          if (contractName) {
            dispatch({ type: 'ADD_CONTRACT_FILE', payload: { name: contractName, filePath } })
          }
        }
      }
    })

    plugin.on('fileManager', 'fileClosed', (filePath: string) => {
      if (filePath && filePath.endsWith('.sol')) {
        dispatch({ type: 'REMOVE_CONTRACT_FILE', payload: filePath })
      }
    })
    // plugin.blockchain.events.on('newTransaction', (tx, receipt) => {
    //   plugin.emit('newTransaction', tx, receipt)
    // })

    // plugin.blockchain.event.register('transactionExecuted', (error, from, to, data, lookupOnly, txResult) => {
    //   if (!lookupOnly) dispatch(setSendValue('0'))
    //   if (error) return
    //   updateAccountBalances(plugin, dispatch)
    //   updateInstanceBalance(plugin, dispatch)
    // })

    // plugin.blockchain.event.register('contextChanged', async (context) => {
    //   dispatch(resetProxyDeployments())
    //   getNetworkProxyAddresses(plugin, dispatch)
    //   setFinalContext(plugin, dispatch)
    //   fillAccountsList(plugin, dispatch)
    //   // 'contextChanged' & 'networkStatus' both are triggered on workspace & network change
    //   // There is chance that pinned contracts state is overridden by other event
    //   // We load pinned contracts for VM environment in this event
    //   // and for other environments in 'networkStatus' event
    //   if (context.startsWith('vm')) await loadPinnedContracts(plugin, dispatch, context)
    // })

    // plugin.blockchain.event.register('networkStatus', async ({ error, network }) => {
    //   if (error) {
    //     const netUI = 'can\'t detect network'
    //     setNetworkNameFromProvider(dispatch, netUI)
    //     return
    //   }
    //   const networkProvider = plugin.networkModule.getNetworkProvider.bind(plugin.networkModule)
    //   const isVM = networkProvider().startsWith('vm') ? true : false
    //   const netUI = !isVM ? `${network.name} (${network.id || '-'}) network` : 'VM'
    //   const pinnedChainId = !isVM ? network.id : networkProvider()
    //   setNetworkNameFromProvider(dispatch, netUI)
    //   setPinnedChainId(dispatch, pinnedChainId)

    //   // Check if provider is changed or network is changed for same provider e.g; Metamask
    //   if (currentNetwork.provider !== networkProvider() || (!isVM && currentNetwork.chainId !== network.id)) {
    //     currentNetwork.provider = networkProvider()
    //     if (!isVM) {
    //       fillAccountsList(plugin, dispatch)
    //       currentNetwork.chainId = network.id
    //       await loadPinnedContracts(plugin, dispatch, pinnedChainId)
    //     }
    //   }
    // })

    // plugin.on('blockchain', 'shouldAddProvidertoUdapp', (name, provider) => addExternalProvider(dispatch, provider))

    // plugin.on('blockchain', 'shouldRemoveProviderFromUdapp', (name, provider) => removeExternalProvider(dispatch, name))

    // plugin.blockchain.events.on('newProxyDeployment', (address, date, contractName) => addNewProxyDeployment(dispatch, address, date, contractName))

    plugin.on('solidity', 'compilationFinished', (file, source, languageVersion, data, input) => broadcastCompilationResult('remix', { file, source, languageVersion, data, input }, plugin, dispatch))

    plugin.on('vyper', 'compilationFinished', (file, source, languageVersion, data) => broadcastCompilationResult('vyper', { file, source, languageVersion, data }, plugin, dispatch))

    plugin.on('lexon', 'compilationFinished', (file, source, languageVersion, data) => broadcastCompilationResult('lexon', { file, source, languageVersion, data }, plugin, dispatch))

    plugin.on('yulp', 'compilationFinished', (file, source, languageVersion, data) => broadcastCompilationResult('yulp', { file, source, languageVersion, data }, plugin, dispatch))

    plugin.on('nahmii-compiler', 'compilationFinished', (file, source, languageVersion, data) => broadcastCompilationResult('nahmii', { file, source, languageVersion, data }, plugin, dispatch))

    plugin.on('hardhat', 'compilationFinished', (file, source, languageVersion, data) => broadcastCompilationResult('hardhat', { file, source, languageVersion, data }, plugin, dispatch))

    plugin.on('foundry', 'compilationFinished', (file, source, languageVersion, data) => broadcastCompilationResult('foundry', { file, source, languageVersion, data }, plugin, dispatch))

    plugin.on('truffle', 'compilationFinished', (file, source, languageVersion, data) => broadcastCompilationResult('truffle', { file, source, languageVersion, data }, plugin, dispatch))

    // plugin.on('desktopHost', 'chainChanged', (context) => {
    //   //console.log('desktopHost chainChanged', context)
    //   fillAccountsList(plugin, dispatch)
    //   updateInstanceBalance(plugin, dispatch)
    // })

    // plugin.on('desktopHost', 'disconnected', () => {
    //   setExecutionContext(plugin, dispatch, { context: 'vm-cancun', fork: '' })
    // })

    // plugin.on('udapp', 'setEnvironmentModeReducer', (env: { context: string, fork: string }, from: string) => {
    //   plugin.call('notification', 'toast', envChangeNotification(env, from))
    //   setExecutionContext(plugin, dispatch, env)
    // })

    // plugin.on('udapp', 'clearAllInstancesReducer', () => {
    //   dispatch(clearAllInstances())
    // })

    // plugin.on('udapp', 'setAccountReducer', (account: string) => {
    //   setAccount(dispatch, account)
    // })

    // plugin.on('udapp', 'addInstanceReducer', (address, abi, name, contractData?) => {
    //   addInstance(dispatch, { contractData, abi, address, name })
    // })

    // plugin.on('filePanel', 'setWorkspace', async () => {
    //   dispatch(resetUdapp())
    //   resetAndInit(plugin)
    //   await migrateSavedContracts(plugin)
    //   plugin.call('manager', 'isActive', 'remixd').then((activated) => {
    //     dispatch(setRemixDActivated(activated))
    //   })
    // })

    // plugin.on('manager', 'pluginActivated', (activatedPlugin: Plugin) => {
    //   if (activatedPlugin.name === 'remixd') {
    //     dispatch(setRemixDActivated(true))
    //   } else {
    //     if (activatedPlugin && activatedPlugin.name.startsWith('injected')) {
    //       plugin.on(activatedPlugin.name, 'accountsChanged', (accounts: Array<string>) => {
    //         const accountsMap = {}
    //         accounts.map(account => { accountsMap[account] = shortenAddress(account, '0')})
    //         dispatch(fetchAccountsListSuccess(accountsMap))
    //         dispatch(setSelectedAccount((window as any).ethereum.selectedAddress || accounts[0]))
    //       })
    //     } else if (activatedPlugin && activatedPlugin.name === 'walletconnect') {
    //       plugin.on('walletconnect', 'accountsChanged', async (accounts: Array<string>) => {
    //         const accountsMap = {}

    //         await Promise.all(accounts.map(async (account) => {
    //           const balance = await plugin.blockchain.getBalanceInEther(account)
    //           const updated = shortenAddress(account, balance)

    //           accountsMap[account] = updated
    //         }))
    //         dispatch(fetchAccountsListSuccess(accountsMap))
    //       })
    //     }
    //   }
    // })

    // plugin.on('manager', 'pluginDeactivated', (plugin: Plugin) => {
    //   if (plugin.name === 'remixd') {
    //     dispatch(setRemixDActivated(false))
    //   }
    // })

    // plugin.on('fileManager', 'currentFileChanged', (currentFile: string) => {
    //   if (/.(.abi)$/.exec(currentFile)) dispatch(setLoadType('abi'))
    //   else if (/.(.sol)$/.exec(currentFile)) dispatch(setLoadType('sol'))
    //   else if (/.(.vy)$/.exec(currentFile)) dispatch(setLoadType('vyper'))
    //   else if (/.(.lex)$/.exec(currentFile)) dispatch(setLoadType('lexon'))
    //   else if (/.(.contract)$/.exec(currentFile)) dispatch(setLoadType('contract'))
    //   else dispatch(setLoadType('other'))
    //   dispatch(setCurrentFile(currentFile))
    // })

    // plugin.recorder.event.register('recorderCountChange', (count) => {
    //   dispatch(setRecorderCount(count))
    // })

    // plugin.event.register('cleared', () => {
    //   dispatch(clearRecorderCount())
    // })
  }, [])

  return (
    <DeployAppContext.Provider value={{ widgetState, dispatch, plugin }}>
      <DeployPortraitView />
    </DeployAppContext.Provider>
  )
}

export default DeployWidget

