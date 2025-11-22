import React, { useMemo, useState } from 'react'
import { AddressToggle, CustomMenu, EnvironmentToggle, shortenAddress } from "@remix-ui/helper"
import { Dropdown } from "react-bootstrap"
import { useIntl } from 'react-intl'
import { EnvAppContext } from '../contexts'
import { useContext } from "react"
import { TrackingContext } from '@remix-ide/tracking'
import { MatomoEvent, UdappEvent } from '@remix-api'
import { forkState, resetVmState, setExecutionContext } from '../actions'
import { EnvCategoryUI } from '../components/envCategoryUI'
import { Provider, Account } from '../types'

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

  const handleAccountSelection = (account: Account) => {
    dispatch({ type: 'SET_SELECTED_ACCOUNT', payload: account.account })
  }

  const handleKebabClick = (e: React.MouseEvent, account: Account) => {
    e.preventDefault() // Prevent default behavior (page reload)
    e.stopPropagation() // Prevent triggering account selection
    // Add your kebab menu logic here
    console.log('Kebab clicked for account:', account)
  }

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

    return [...Array.from(categoryMap.values()), ...itemsWithoutCategory]
  }, [widgetState.providers.providerList])

  const selectedProvider = useMemo(() => {
    return widgetState.providers.providerList.find(provider => provider.name === widgetState.providers.selectedProvider)
  }, [widgetState.providers.selectedProvider])

  const selectedAccount = useMemo(() => {
    return widgetState.accounts.defaultAccounts.find(account => account.account === widgetState.accounts.selectedAccount) || widgetState.accounts.defaultAccounts[0]
  }, [widgetState.accounts.selectedAccount, widgetState.accounts.defaultAccounts])

  return (
    <>
      <style>{`
        .environment-item-hover:hover {
          background-color: var(--custom-onsurface-layer-3) !important;
          border: 1px solid var(--bs-border-color) !important;
        }
        .account-item-hover:hover {
          background-color: var(--custom-onsurface-layer-3) !important;
          border: 1px solid var(--bs-border-color) !important;
          border-radius: 0.375rem !important;
        }
        .category-item-hover:hover {
          background-color: var(--custom-onsurface-layer-4) !important;
          border: 1px solid var(--bs-border-color) !important;
        }
        .account-balance-container {
          position: relative;
        }
        .account-balance-text {
          display: block;
        }
        .account-kebab-icon {
          display: none;
        }
        .account-item-hover:hover .account-balance-text {
          display: none;
        }
        .account-item-hover:hover .account-kebab-icon {
          display: block;
          padding-right: 0.5rem;
        }
        .account-kebab-icon:hover {
          color: white !important;
        }
      `}</style>
      <div className='card ms-2' style={{ backgroundColor: 'var(--custom-onsurface-layer-1)' }}>
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
              className="w-100 d-inline-block border form-control"
              environmentUI={<EnvCategoryUI />}
              style={{ backgroundColor: 'var(--custom-onsurface-layer-2)' }}
            >
              <div style={{ flexGrow: 1, overflow: 'hidden', display:'flex', justifyContent:'left' }}>
                <div className="text-truncate text-secondary">
                  <span> { selectedProvider?.category || selectedProvider?.displayName || 'Remix VM' }</span>
                </div>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu as={CustomMenu} className="w-100 custom-dropdown-items overflow-hidden" style={{ backgroundColor: 'var(--custom-onsurface-layer-2)' }}>
              {
                uniqueDropdownItems.map((provider, index) => {
                  return (
                    <Dropdown.Item key={index} onClick={() => handleProviderSelection(provider)} className="environment-item-hover">
                      {provider.category ? provider.category : provider.displayName}
                    </Dropdown.Item>
                  )})
              }
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <div className="d-flex px-3">
          <Dropdown className="w-100">
            <Dropdown.Toggle as={AddressToggle} className="w-100 d-inline-block border form-control" style={{ backgroundColor: 'var(--custom-onsurface-layer-2)' }}>
              <div className="d-flex align-items-center">
                <div className="me-auto text-nowrap text-truncate overflow-hidden font-sm w-100">
                  <div className="d-flex align-items-center justify-content-between w-100">
                    <div className='d-flex flex-column align-items-start'>
                      <div className="text-truncate text-dark">
                        <span>{selectedAccount?.alias}</span><i className="fa-solid fa-pen small ms-1"></i>
                      </div>
                      <div style={{ color: 'var(--bs-tertiary-color)' }}>
                        <span className="small">{shortenAddress(selectedAccount?.account)}</span><i className="fa-solid fa-copy small ms-1"></i>
                      </div>
                    </div>
                    <div style={{ color: 'var(--bs-tertiary-color)' }}><span>{`${selectedAccount?.balance} ${selectedAccount?.symbol}`}</span></div>
                  </div>
                </div>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu as={CustomMenu} className="w-100 custom-dropdown-items overflow-hidden" style={{ backgroundColor: 'var(--custom-onsurface-layer-2)' }}>
              {
                widgetState.accounts.defaultAccounts.map((account, index) => {
                  return (
                    <Dropdown.Item key={index} className="d-flex align-items-center justify-content-between p-1 m-1 account-item-hover" onClick={() => handleAccountSelection(account)} style={{ cursor: 'pointer' }}>
                      <div className='d-flex flex-column align-items-start'>
                        <div className="text-truncate text-dark">
                          <span>{account?.alias}</span>
                        </div>
                        <div style={{ color: 'var(--bs-tertiary-color)' }}>
                          <span className="small">{shortenAddress(account?.account)}</span><i className="fa-solid fa-copy small ms-1"></i>
                        </div>
                      </div>
                      <div className="account-balance-container" style={{ color: 'var(--bs-tertiary-color)' }}>
                        <span className="account-balance-text">{`${account?.balance} ${account?.symbol}`}</span>
                        <i className="account-kebab-icon fas fa-ellipsis-v" onClick={(e) => handleKebabClick(e, account)} style={{ cursor: 'pointer' }}></i>
                      </div>
                    </Dropdown.Item>
                  )
                })
              }
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <div className="mx-auto py-3" style={{ color: 'var(--bs-tertiary-color)' }}>
          {/* <span className="small me-1">Deployed Contracts</span><span className="small me-2 text-primary">{ environmentSchema.deployedContracts.length }</span>
          <span className="small me-1">Transactions recorded</span><span className="small text-primary">{ environmentSchema.transactionsRecorded.length }</span> */}
        </div>
      </div>
    </>
  )
}

export default EnvironmentPortraitView