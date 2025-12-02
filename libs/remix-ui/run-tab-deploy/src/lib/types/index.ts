import { Engine, Plugin } from "@remixproject/engine"
import { Dispatch } from 'react'
import { CompilationResult, CompilationSourceCode } from '@remix-project/remix-solidity'
import type { ContractData } from "@remix-project/core-plugin"

type FilePath = string

export interface DeployAppContextType {
  plugin: Plugin & { engine: Engine, editor: any }
  widgetState: DeployWidgetState
  dispatch: Dispatch<Actions>
}

export interface DeployWidgetState {
  contracts: {
    contractList: (CompiledContractPayload & {
      isCompiled: boolean,
      isCompiling: boolean
    })[]
  }
  valueUnit: 'wei' | 'gwei' | 'finney' | 'ether'
  gasLimit: string
}

export interface ActionPayloadTypes {
  ADD_CONTRACT_FILE: { name: string, filePath: FilePath },
  UPDATE_COMPILED_CONTRACT: CompiledContractPayload,
  REMOVE_CONTRACT_FILE: FilePath,
  SET_VALUE_UNIT: 'wei' | 'gwei' | 'finney' | 'ether',
  SET_GAS_LIMIT: string
}

export interface Action<T extends keyof ActionPayloadTypes> {
  type: T
  payload: ActionPayloadTypes[T]
}

export type Actions = {[A in keyof ActionPayloadTypes]: Action<A>}[keyof ActionPayloadTypes]

export type CompilationRawResult = {
  file: string,
  source: CompilationSourceCode,
  languageVersion: string,
  data: CompilationResult,
  input?: any
}

export type VisitedContract = {
  name: string,
  object: any,
  file: string
}

export type CompiledContractPayload = {
  name: string,
  filePath: FilePath,
  contractData: ContractData,
  isUpgradeable: boolean
}

