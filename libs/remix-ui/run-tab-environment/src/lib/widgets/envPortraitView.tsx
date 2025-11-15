import React, { useMemo } from 'react'
import { CustomMenu, EnvironmentToggle } from "@remix-ui/helper"
import { Dropdown } from "react-bootstrap"
import { useIntl } from 'react-intl'
import { EnvAppContext } from '../contexts'
import { useContext } from "react"
import { TrackingContext } from '@remix-ide/tracking'
import { MatomoEvent, UdappEvent } from '@remix-api'
import { forkState, resetVmState, setExecutionContext } from '../actions'
import { EnvCategoryUI } from '../components/envCategoryUI'
import { Provider } from '../types'

function EnvironmentPortraitView() {
  const { plugin, widgetState, dispatch } = useContext(EnvAppContext)
  const { trackMatomoEvent: baseTrackEvent } = useContext(TrackingContext)
  const trackMatomoEvent = <T extends MatomoEvent = UdappEvent>(event: T) => {
    baseTrackEvent?.<T>(event)
  }
  const intl = useIntl()

  const handleResetClick = async() => {
    trackMatomoEvent({ category: 'udapp', action: 'deleteState', name: 'deleteState clicked', isClick: true })
    await resetVmState(plugin, widgetState, intl)
  }

  const handleForkClick = async() => {
    trackMatomoEvent({ category: 'udapp', action: 'forkState', name: 'forkState clicked', isClick: true })
    await forkState(widgetState, plugin, dispatch, intl)
  }

  const handleProviderSelection = (provider: Provider) => {
    setExecutionContext(provider, plugin, widgetState, dispatch)
  }

  // Create unique dropdown items: one per category for providers with categories, individual entries for providers without
  const uniqueDropdownItems = useMemo(() => {
    const categoryMap = new Map<string, Provider>()
    const itemsWithoutCategory: Provider[] = []

    widgetState.providers.providerList.forEach((provider) => {
      if (provider.category) {
        // Only add the category once (use first provider with that category)
        if (!categoryMap.has(provider.category)) {
          categoryMap.set(provider.category, provider)
        }
      } else {
        // Providers without category are shown individually
        itemsWithoutCategory.push(provider)
      }
    })

    // Combine unique categories and providers without categories
    return [...Array.from(categoryMap.values()), ...itemsWithoutCategory]
  }, [widgetState.providers.providerList])

  return (
    <>
      <div className='card ms-2 bg-light'>
        <div className="d-flex align-items-center justify-content-between p-3">
          <div className="d-flex align-items-center">
            <h6 className="my-auto" style={{ color: 'white' }}>{intl.formatMessage({ id: 'udapp.environment' })}</h6>
          </div>
          <div className="toggle-container">
            <button className='btn btn-primary btn-sm small me-2' style={{ fontSize: '0.7rem' }} onClick={handleForkClick}>
              <i className='fas fa-code-branch'></i> {intl.formatMessage({ id: 'udapp.fork' })}
            </button>
            <button className='btn btn-outline-danger btn-sm small' style={{ fontSize: '0.7rem' }} onClick={handleResetClick}>
              <i className='fas fa-redo'></i> {intl.formatMessage({ id: 'udapp.reset' })}
            </button>
          </div>
        </div>
        <div className="d-flex p-3 pt-0">
          <Dropdown className="w-100">
            <Dropdown.Toggle
              as={EnvironmentToggle}
              className="btn-secondary w-100 d-inline-block border form-control"
              environmentUI={<EnvCategoryUI />}
            >
              <div style={{ flexGrow: 1, overflow: 'hidden', display:'flex', justifyContent:'left' }}>
                <div className="text-truncate text-secondary">
                  <span> {
                    widgetState.providers.providerList.find(provider => provider.name === widgetState.providers.selectedProvider)?.category
                    || widgetState.providers.providerList.find(provider => provider.name === widgetState.providers.selectedProvider)?.displayName
                    || 'Remix VM'
                  }</span>
                </div>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu as={CustomMenu} className="w-100 custom-dropdown-items overflow-hidden bg-light">
              {
                uniqueDropdownItems.map((provider) => {
                  return (
                    <Dropdown.Item key={provider.name} onClick={() => handleProviderSelection(provider)}>
                      {provider.category ? provider.category : provider.displayName}
                    </Dropdown.Item>
                  )})
              }
            </Dropdown.Menu>
          </Dropdown>
        </div>
        {/* <div className="d-flex px-3">
          <Dropdown className="w-100">
            <Dropdown.Toggle as={AddressToggle} className="btn-secondary w-100 d-inline-block border form-control">
              <div className="d-flex align-items-center">
                <div className="me-auto text-nowrap text-truncate overflow-hidden font-sm w-100">
                  <div className="d-flex align-items-center justify-content-between w-100">
                    <div className='d-flex flex-column align-items-start'>
                      <div className="text-truncate text-secondary">
                        <span>{environmentSchema.accountList[0].name}</span><i className="fa-solid fa-pen small ms-1"></i>
                      </div>
                      <div style={{ color: 'var(--bs-tertiary-color)' }}>
                        <span className="small">{environmentSchema.accountList[0].address}</span><i className="fa-solid fa-copy small ms-1"></i>
                      </div>
                    </div>
                    <div><span>{environmentSchema.accountList[0].balance}</span></div>
                  </div>
                </div>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu as={CustomMenu} className="w-100 custom-dropdown-items overflow-hidden bg-light">
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <div className="mx-auto py-3" style={{ color: 'var(--bs-tertiary-color)' }}>
          <span className="small me-1">Deployed Contracts</span><span className="small me-2 text-primary">{ environmentSchema.deployedContracts.length }</span>
          <span className="small me-1">Transactions recorded</span><span className="small text-primary">{ environmentSchema.transactionsRecorded.length }</span>
        </div> */}
      </div>
    </>
  )
}

export default EnvironmentPortraitView