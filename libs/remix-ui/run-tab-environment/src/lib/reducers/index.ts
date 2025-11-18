import { Actions, WidgetState } from '../types'

export const widgetInitialState: WidgetState = {
  providers: {
    defaultProvider: 'vm-prague',
    selectedProvider: 'vm-prague',
    providerList: [],
    isRequesting: false,
    isSuccessful: false,
    error: null
  },
  accounts: {
    selectedAccount: '',
    smartAccounts: [],
    defaultAccounts: [],
    isRequesting: false,
    isSuccessful: false,
    error: null
  },
  network: {
    chainId: '',
    name: ''
  }
}

export const widgetReducer = (state = widgetInitialState, action: Actions): WidgetState => {
// @ts-ignore
  switch (action.type) {

  case 'LOADING_ALL_PROVIDERS':
    return {
      ...state,
      providers: {
        ...state.providers,
        isRequesting: true,
        isSuccessful: false
      }
    }

  case 'COMPLETED_LOADING_ALL_PROVIDERS':
    return {
      ...state,
      providers: {
        ...state.providers,
        isRequesting: false,
        isSuccessful: true
      }
    }

  case 'LOADING_ALL_ACCOUNTS':
    return {
      ...state,
      accounts: {
        ...state.accounts,
        isRequesting: true,
        isSuccessful: false
      }
    }

  case 'COMPLETED_LOADING_ALL_ACCOUNTS':
    return {
      ...state,
      accounts: {
        ...state.accounts,
        isRequesting: false,
        isSuccessful: true
      }
    }

  case 'SET_CURRENT_PROVIDER':
    return {
      ...state,
      providers: {
        ...state.providers,
        selectedProvider: action.payload
      }
    }

  case 'ADD_PROVIDER': {
    const payload = action.payload
    const length = state.providers.providerList.length
    // Create a new array copy to avoid mutating the original
    const providerList = [...state.providers.providerList]

    if (length === 0) {
      providerList.push(payload)
    } else {
      let index = 0
      for (const provider of providerList) {
        if (provider.position >= payload.position) {
          providerList.splice(index, 0, payload)
          break;
        }
        index++
      }
      if (length === providerList.length) {
        providerList.push(payload)
      }
    }
    return {
      ...state,
      providers: {
        ...state.providers,
        providerList
      }
    }
  }

  case 'REMOVE_PROVIDER': {
    const payload = action.payload
    const name = payload.name
    const providerList = state.providers.providerList
    const providers = (providerList[payload.category] || []).filter((el) => el.name !== name)

    return {
      ...state,
      providers: {
        ...state.providers,
        providerList: {
          ...providerList,
          [payload.category]: providers
        }
      }
    }
  }

  case 'SET_ACCOUNTS': {
    console.log('SET_ACCOUNTS', action.payload)
    return {
      ...state,
      accounts: {
        ...state.accounts,
        defaultAccounts: action.payload
      }
    }
  }

  case 'SET_SMART_ACCOUNTS': {
    return {
      ...state,
      accounts: {
        ...state.accounts,
        smartAccounts: action.payload
      }
    }
  }

  case 'SET_SELECTED_ACCOUNT': {
    return {
      ...state,
      accounts: {
        ...state.accounts,
        selectedAccount: action.payload
      }
    }
  }

  default:
    throw new Error()
  }
}
