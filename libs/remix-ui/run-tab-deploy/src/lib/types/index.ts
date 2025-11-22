import { Engine, Plugin } from "@remixproject/engine"
import { Dispatch } from 'react'
import { ContractData, FuncABI } from '@remix-project/core-plugin'
import { CompilerAbstract } from '@remix-project/remix-solidity'

type FilePath = string

export interface DeployAppContextType {
  plugin: Plugin & { engine: Engine, blockchain: any, compilersArtefacts: any, editor: any, fileManager: any }
  widgetState: DeployWidgetState
  dispatch: Dispatch<Actions>
}

export interface DeployWidgetState {
  contracts: {
    selectedContract: string,
    contractList: {
      filePath: FilePath,
      isCompiled: boolean,
      isCompiling: boolean
    }[]
  }
}

export interface ActionPayloadTypes {
  SET_SELECTED_CONTRACT: string
  ADD_CONTRACT: FilePath
}

export interface Action<T extends keyof ActionPayloadTypes> {
  type: T
  payload: ActionPayloadTypes[T]
}

export type Actions = {[A in keyof ActionPayloadTypes]: Action<A>}[keyof ActionPayloadTypes]

