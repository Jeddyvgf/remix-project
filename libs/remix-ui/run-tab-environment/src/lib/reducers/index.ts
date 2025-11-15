import { Actions, WidgetState } from '../types'

export const widgetInitialState: WidgetState = {
  providers: {
    defaultProvider: 'vm-prague',
    selectedProvider: 'vm-prague',
    providerList: [],
    isRequesting: false,
    isSuccessful: false,
    error: null
  }
}

export const widgetReducer = (state = widgetInitialState, action: Actions): WidgetState => {
// @ts-ignore
  switch (action.type) {

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
    console.log('providerList: ', providerList)
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

  default:
    throw new Error()
  }
}
