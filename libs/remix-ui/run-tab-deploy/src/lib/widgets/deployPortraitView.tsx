import React, { useContext, useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { Dropdown } from 'react-bootstrap'
import { AddressToggle, CustomMenu, CustomToggle, extractNameFromKey } from '@remix-ui/helper'
import { CopyToClipboard } from '@remix-ui/clipboard'
import { DeployAppContext } from '../contexts'
import { DeployWidgetState } from '../types'
import { Provider } from '@remix-ui/run-tab-environment'

function DeployPortraitView() {
  const { plugin, widgetState, dispatch } = useContext(DeployAppContext)
  const [isExpanded, setIsExpanded] = useState(true)
  const [defaultProvider, setDefaultProvider] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  useEffect(() => {
    (async () => {
      const defaultProvider = await plugin.call('udappEnv', 'getDefaultProvider')

      setDefaultProvider(defaultProvider)
    })()

    plugin.on('udappEnv', 'providersChanged', (provider: Provider) => {
      setSelectedProvider(provider)
    })
  }, [])

  return (
    <>
      <style>{`
        .input-with-copy-hover:hover .copy-icon-hover {
          opacity: 1 !important;
        }
      `}</style>
      <div className="card ms-2 mt-2" style={{ backgroundColor: 'var(--custom-onsurface-layer-1)' }}>
        <div className="p-3 d-flex align-items-center justify-content-between" onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
          <div className='d-flex align-items-center gap-2'>
            <h6 className="my-auto" style={{ color: 'white', margin: 0 }}>
              <FormattedMessage id="udapp.deploy" defaultMessage="Deploy" />
            </h6>
            <span className="small text-secondary">{ selectedProvider && selectedProvider?.category ? `${selectedProvider.category} ${selectedProvider?.displayName}` : `Remix VM ${defaultProvider?.replace('vm-', '')}` }</span>
          </div>
          <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`} style={{ color: 'var(--bs-tertiary-color)' }}></i>
        </div>
        {isExpanded && (
          <div className="px-3 pb-3">
            {/* Contract Selection */}
            <div className="d-flex border-bottom pb-3">
              <Dropdown className="w-100">
                <div className='d-flex align-items-center justify-content-between'>
                  <Dropdown.Toggle as={AddressToggle} className="w-100 d-inline-block border form-control" style={{ backgroundColor: 'var(--custom-onsurface-layer-2)' }}>
                    <div className="d-flex align-items-center">
                      <div className="me-auto text-nowrap text-truncate overflow-hidden font-sm w-100">
                        <div className="d-flex align-items-center justify-content-between w-100">
                          <div className='d-flex flex-column align-items-start'>
                            <div className="text-truncate text-white">
                              <span>Contract</span>
                            </div>
                            <div style={{ color: 'var(--bs-tertiary-color)' }}>
                              <span className="small">{extractNameFromKey(widgetState.contracts.selectedContract) || 'No contract selected'}</span>
                            </div>
                          </div>
                          {widgetState.contracts.contractList.find((contract) => contract.filePath === widgetState.contracts.selectedContract)?.isCompiled && (
                            <span className={`badge border p-2 text-success`} style={{ fontWeight: 'light', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                              <i className="fas fa-check"></i> Compiled
                            </span>
                          )}
                          {widgetState.contracts.contractList.find((contract) => contract.filePath === widgetState.contracts.selectedContract)?.isCompiling && (
                            <span className={`badge border p-2 text-info`} style={{ fontWeight: 'light', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                              <i className="fas fa-spinner fa-spin"></i> Compiling
                            </span>
                          )}
                          {widgetState.contracts.contractList.find((contract) => contract.filePath === widgetState.contracts.selectedContract && !contract.isCompiled && !contract.isCompiling) && (
                            <span className={`badge border p-2 text-secondary`} style={{ fontWeight: 'light', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                              Not compiled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Dropdown.Toggle>
                  <span className="ms-2" style={{ color: 'var(--bs-tertiary-color)', position: 'relative' }}>
                    <i className="fas fa-ellipsis-v px-1" style={{ cursor: 'pointer', fontSize: '1rem' }}></i>
                  </span>
                </div>

                {widgetState.contracts.contractList.length > 0 && (
                  <Dropdown.Menu as={CustomMenu} className="w-100 custom-dropdown-items overflow-hidden" style={{ backgroundColor: 'var(--custom-onsurface-layer-2)' }}>
                    {widgetState.contracts.contractList.map((contract) => (
                      <Dropdown.Item key={contract.filePath} className="d-flex align-items-center" onClick={() => dispatch({ type: 'SET_SELECTED_CONTRACT', payload: contract.filePath })}>
                        <div className="me-auto text-nowrap text-truncate overflow-hidden font-sm w-100">
                          <div className="d-flex align-items-center justify-content-between w-100">
                            <div className='d-flex flex-column align-items-start'>
                              <div className="text-truncate text-white">
                                <span>{extractNameFromKey(contract.filePath)}</span>
                              </div>
                              <div style={{ color: 'var(--bs-tertiary-color)' }}>
                                <span className="small">{extractNameFromKey(contract.filePath)}</span>
                              </div>
                            </div>
                            {contract.isCompiled && (
                              <span className={`badge border p-2 text-success`} style={{ fontWeight: 'light', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                                <i className="fas fa-check"></i> Compiled
                              </span>
                            )}
                            {contract.isCompiling && (
                              <span className={`badge border p-2 text-info`} style={{ fontWeight: 'light', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                                <i className="fas fa-spinner fa-spin"></i> Compiling
                              </span>)}
                            {!contract.isCompiled && !contract.isCompiling && (
                              <span className={`badge border p-2 text-secondary`} style={{ fontWeight: 'light', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                                Not compiled
                              </span>
                            )}
                          </div>
                        </div>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                )}
              </Dropdown>
            </div>

            {/* Constructor Parameters */}
            <div className='border-bottom pb-3'>
              {/* proposalNames parameter 1 */}
              <div className="d-flex gap-2 my-3">
                <div className='btn border-0 p-0' style={{ minWidth: '120px' }}>
                  <div className='d-flex flex-column align-items-start'>
                    <span className="small text-white">proposalNames</span>
                    <span className="text-secondary font-weight-light" style={{ fontSize: '0.7rem' }}>bytes32[]</span>
                  </div>
                </div>
                <div className="position-relative flex-fill input-with-copy-hover">
                  <input
                    type="text"
                    className="form-control form-control-sm border-0"
                    placeholder="[name1, name2, ...]"
                    style={{ backgroundColor: 'var(--bs-body-bg)', color: 'white', fontSize: '0.7rem', paddingRight: '1.5rem', minHeight: '30px' }}
                  />
                  <div className="copy-icon-hover" style={{ position: 'absolute', right: '8px', top: '40%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
                    <CopyToClipboard tip="Copy" icon="fa-copy" direction="top" getContent={() => ''}>
                      <span style={{ pointerEvents: 'auto' }}>
                        <i className="far fa-copy" style={{ color: 'var(--bs-secondary)', fontSize: '0.75rem' }}></i>
                      </span>
                    </CopyToClipboard>
                  </div>
                </div>
              </div>

              {/* proposalNames parameter 2 */}
              <div className="d-flex gap-2 my-3">
                <div className='btn border-0 p-0' style={{ minWidth: '120px' }}>
                  <div className='d-flex flex-column align-items-start'>
                    <span className="small text-white">proposalNames</span>
                    <span className="text-secondary font-weight-light" style={{ fontSize: '0.7rem' }}>bytes32[]</span>
                  </div>
                </div>
                <div className="position-relative flex-fill input-with-copy-hover">
                  <input
                    type="text"
                    className="form-control form-control-sm border-0"
                    placeholder="[name1, name2, ...]"
                    style={{ backgroundColor: 'var(--bs-body-bg)', color: 'white', fontSize: '0.7rem', paddingRight: '1.5rem', minHeight: '30px' }}
                  />
                  <div className="copy-icon-hover" style={{ position: 'absolute', right: '8px', top: '40%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
                    <CopyToClipboard tip="Copy" icon="fa-copy" direction="top" getContent={() => ''}>
                      <span style={{ pointerEvents: 'auto' }}>
                        <i className="far fa-copy" style={{ color: 'var(--bs-secondary)', fontSize: '0.75rem' }}></i>
                      </span>
                    </CopyToClipboard>
                  </div>
                </div>
              </div>

              {/* proposalNames parameter 3 */}
              <div className="d-flex gap-2 my-3">
                <div className='btn border-0 p-0' style={{ minWidth: '120px' }}>
                  <div className='d-flex flex-column align-items-start'>
                    <span className="small text-white">proposalNames</span>
                    <span className="text-secondary font-weight-light" style={{ fontSize: '0.7rem' }}>bytes32[]</span>
                  </div>
                </div>
                <div className="position-relative flex-fill input-with-copy-hover">
                  <input
                    type="text"
                    className="form-control form-control-sm border-0"
                    placeholder="[name1, name2, ...]"
                    style={{ backgroundColor: 'var(--bs-body-bg)', color: 'white', fontSize: '0.7rem', paddingRight: '1.5rem', minHeight: '30px' }}
                  />
                  <div className="copy-icon-hover" style={{ position: 'absolute', right: '8px', top: '40%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
                    <CopyToClipboard tip="Copy" icon="fa-copy" direction="top" getContent={() => ''}>
                      <span style={{ pointerEvents: 'auto' }}>
                        <i className="far fa-copy" style={{ color: 'var(--bs-secondary)', fontSize: '0.75rem' }}></i>
                      </span>
                    </CopyToClipboard>
                  </div>
                </div>
              </div>

              {/* Call Data and Parameters */}
              <div className="d-flex align-items-center justify-content-between gap-2">
                <CopyToClipboard tip="Copy Call Data" icon="fa-clipboard" direction="bottom" getContent={() => ''}>
                  <button className="btn btn-sm flex-fill border-0" style={{ minWidth: '120px', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                    <span className="text-secondary">Call data</span>
                    <i className="far fa-copy ms-1 text-secondary"></i>
                  </button>
                </CopyToClipboard>
                <CopyToClipboard tip="Copy Parameters" icon="fa-clipboard" direction="bottom" getContent={() => ''}>
                  <button className="btn btn-sm flex-fill border-0" style={{ minWidth: '120px', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                    <span className="text-secondary">Parameters</span>
                    <i className="far fa-copy ms-1 text-secondary"></i>
                  </button>
                </CopyToClipboard>
              </div>
            </div>

            {/* Value and Gas Limit */}
            <div className='mt-3'>
              {/* Value */}
              <div className="d-flex align-items-center gap-3 mb-3">
                <label className="text-white mb-2" style={{ fontSize: '0.9rem', minWidth: '75px' }}>
                  <FormattedMessage id="udapp.value" defaultMessage="Value" />
                </label>
                <div className="position-relative flex-fill">
                  <input
                    type="text"
                    className="form-control form-control-sm border-0"
                    placeholder="300000000000000000000000000000000"
                    style={{ backgroundColor: 'var(--bs-body-bg)', color: 'white', flex: 1, paddingRight: '4rem' }}
                  />
                  <Dropdown style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}>
                    <Dropdown.Toggle
                      as={CustomToggle}
                      className="btn-sm border-0 p-0 ps-1 text-secondary rounded"
                      style={{ backgroundColor: 'var(--custom-onsurface-layer-2)', color: 'white' }}
                      icon="fas fa-caret-down ms-2"
                      useDefaultIcon={false}
                    >
                      wei
                    </Dropdown.Toggle>
                    <Dropdown.Menu style={{ backgroundColor: 'var(--custom-onsurface-layer-2)' }}>
                      <Dropdown.Item>wei</Dropdown.Item>
                      <Dropdown.Item>gwei</Dropdown.Item>
                      <Dropdown.Item>finney</Dropdown.Item>
                      <Dropdown.Item>ether</Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>

              {/* Gas Limit */}
              <div className="d-flex align-items-center gap-3 mb-3">
                <label className="text-white mb-2" style={{ fontSize: '0.9rem', minWidth: '75px' }}>
                  <FormattedMessage id="udapp.gasLimit" defaultMessage="Gas limit" />
                </label>
                <div className="position-relative flex-fill">
                  <span
                    className="p-1 pt-0 rounded"
                    style={{
                      position: 'absolute',
                      left: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'var(--custom-onsurface-layer-2)',
                      color: 'var(--bs-primary)'
                    }}
                  >
                    auto
                  </span>
                  <input
                    type="text"
                    className="form-control form-control-sm border-0"
                    placeholder="3000000"
                    style={{ backgroundColor: 'var(--bs-body-bg)', color: 'white', flex: 1, paddingLeft: '4rem' }}
                  />
                </div>
              </div>

              {/* Deploy Button */}
              <div>
                <button
                  className="btn btn-primary w-100 py-2"
                  style={{ fontSize: '1rem', fontWeight: '500' }}
                >
                  <FormattedMessage id="udapp.deploy" defaultMessage="Deploy" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default DeployPortraitView
