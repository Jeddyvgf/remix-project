import { Actions, DeployWidgetState } from '../types'

export const deployInitialState: DeployWidgetState = {
  contracts: {
    selectedContract: '',
    contractList: []
  }
}

export const deployReducer = (state = deployInitialState, action: Actions): DeployWidgetState => {
  switch (action.type) {

  case 'SET_SELECTED_CONTRACT': {
    return {
      ...state,
      contracts: {
        ...state.contracts,
        selectedContract: action.payload
      }
    }
  }

  case 'ADD_CONTRACT': {
    const contract = {
      filePath: action.payload,
      isCompiled: false,
      isCompiling: false
    }
    const contractList = state.contracts.contractList.find((contract) => contract.filePath === action.payload) ? state.contracts.contractList : [...state.contracts.contractList, contract]

    return {
      ...state,
      contracts: {
        ...state.contracts,
        selectedContract: state.contracts.selectedContract || action.payload,
        contractList
      }
    }
  }

  default:
    return state
  }
}

