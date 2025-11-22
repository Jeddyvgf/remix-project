import React, { useEffect, useReducer } from 'react'
import { DeployAppContext } from './contexts'
import { deployInitialState, deployReducer } from './reducers'
import DeployPortraitView from './widgets/deployPortraitView'
import { Plugin } from '@remixproject/engine'
import { DeployWidgetState } from './types'

function DeployWidget({ plugin }: { plugin: Plugin & { engine: any, blockchain: any, compilersArtefacts: any, editor: any, fileManager: any, setStateGetter?: (getter: () => DeployWidgetState) => void } }) {
  const [widgetState, dispatch] = useReducer(deployReducer, deployInitialState)

  useEffect(() => {
    if (plugin.setStateGetter) {
      plugin.setStateGetter(() => widgetState)
    }
  }, [plugin, widgetState])

  useEffect(() => {
    plugin.on('fileManager', 'currentFileChanged', (filePath: string) => {
      dispatch({ type: 'ADD_CONTRACT', payload: filePath })
    })
  }, [])

  return (
    <DeployAppContext.Provider value={{ widgetState, dispatch, plugin }}>
      <DeployPortraitView />
    </DeployAppContext.Provider>
  )
}

export default DeployWidget

