import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { Dropdown } from 'react-bootstrap'
import { AddressToggle, CustomMenu, CustomToggle, extractNameFromKey, getMultiValsString } from '@remix-ui/helper'
import { CopyToClipboard } from '@remix-ui/clipboard'
import { DeployAppContext } from '../contexts'
import { Provider } from '@remix-ui/run-tab-environment'
import { useIntl } from 'react-intl'
import * as remixLib from '@remix-project/remix-lib'

const txFormat = remixLib.execution.txFormat
const txHelper = remixLib.execution.txHelper

function DeployPortraitView() {
  const { plugin, widgetState, dispatch } = useContext(DeployAppContext)
  const [isExpanded, setIsExpanded] = useState(true)
  const [defaultProvider, setDefaultProvider] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [selectedContractIndex, setSelectedContractIndex] = useState<number | null>(0)
  const [expandedInputs, setExpandedInputs] = useState<Set<number>>(new Set())
  const [inputValues, setInputValues] = useState<{[key: number]: string}>({})
  const intl = useIntl()

  useEffect(() => {
    (async () => {
      const defaultProvider = await plugin.call('udappEnv', 'getDefaultProvider')

      setDefaultProvider(defaultProvider)
    })()

    plugin.on('udappEnv', 'providersChanged', (provider: Provider) => {
      setSelectedProvider(provider)
    })
  }, [])

  const selectedContract = useMemo(() => {
    return widgetState.contracts.contractList[selectedContractIndex] || null
  }, [widgetState.contracts.contractList, selectedContractIndex])

  const constructorInterface = useMemo(() => {
    return selectedContract?.contractData?.getConstructorInterface() || null
  }, [widgetState.contracts.contractList, selectedContract])

  const getEncodedCall = () => {
    const multiString = getMultiValsString(Object.values(inputValues))
    // copy-to-clipboard icon is only visible for method requiring input params
    if (!multiString) {
      return intl.formatMessage({ id: 'udapp.getEncodedCallError' })
    }
    const multiJSON = JSON.parse('[' + multiString + ']')

    const encodeObj = txFormat.encodeData(constructorInterface, multiJSON, constructorInterface?.type === 'constructor' ? selectedContract?.contractData?.bytecodeObject : null)

    if (encodeObj.error) {
      console.error(encodeObj.error)
      return encodeObj.error
    } else {
      return encodeObj.data
    }
  }

  const getEncodedParams = () => {
    try {
      const multiString = getMultiValsString(Object.values(inputValues))
      // copy-to-clipboard icon is only visible for method requiring input params
      if (!multiString) {
        return intl.formatMessage({ id: 'udapp.getEncodedCallError' })
      }
      const multiJSON = JSON.parse('[' + multiString + ']')
      return txHelper.encodeParams(constructorInterface, multiJSON)
    } catch (e) {
      console.error(e)
    }
  }

  const toggleInputExpansion = (index: number) => {
    setExpandedInputs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const handleInputChange = (index: number, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [index]: value
    }))
  }

  return (
    <>
      <style>{`
        .input-with-copy-hover:hover .copy-icon-hover {
          opacity: 1 !important;
        }
        .contract-dropdown-item-hover:hover .unit-dropdown-item:hover .unit-dropdown-item-hover:hover {
          background-color: var(--custom-onsurface-layer-3) !important;
          border: 1px solid var(--bs-border-color) !important;
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
            <div className="d-flex pb-3">
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
                              <span className="small">{extractNameFromKey(selectedContract?.filePath) || 'No contract selected'}</span>
                            </div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            {selectedContract?.isCompiled && (
                              <span className={`badge border p-2 text-success`} style={{ fontWeight: 'light', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                                <i className="fas fa-check"></i> Compiled
                              </span>
                            )}
                            {selectedContract?.isCompiling && (
                              <span className={`badge border p-2 text-info`} style={{ fontWeight: 'light', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                                <i className="fas fa-spinner fa-spin"></i> Compiling
                              </span>
                            )}
                            {selectedContract && !selectedContract?.isCompiled && !selectedContract?.isCompiling && (
                              <span className={`badge border p-2 text-secondary`} style={{ fontWeight: 'light', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                              Not compiled
                              </span>
                            )}
                          </div>
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
                    {widgetState.contracts.contractList.map((contract, index) => (
                      <Dropdown.Item key={contract.filePath} className="d-flex align-items-center contract-dropdown-item-hover" onClick={() => setSelectedContractIndex(index)}>
                        <div className="me-auto text-nowrap text-truncate overflow-hidden font-sm w-100">
                          <div className="d-flex align-items-center justify-content-between w-100">
                            <div className='d-flex flex-column align-items-start'>
                              <div className="text-truncate text-white">
                                <span>{contract.name}</span>
                              </div>
                              <div style={{ color: 'var(--bs-tertiary-color)' }}>
                                <span className="small">{extractNameFromKey(contract.filePath)}</span>
                              </div>
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
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
                        </div>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                )}
              </Dropdown>
            </div>

            {/* Constructor Parameters */}
            {
              constructorInterface?.type === 'constructor' && constructorInterface?.inputs.length > 0 && (
                <div className='border-top pb-3'>
                  {
                    constructorInterface?.inputs.map((input, index) => {
                      const isExpanded = expandedInputs.has(index)
                      const currentValue = inputValues[index] || ''
                      return (
                        <div key={index} className="my-3">
                          <div className="d-flex gap-2">
                            <div
                              className='btn border-0 p-0'
                              style={{ minWidth: '120px', cursor: 'pointer' }}
                              onClick={() => toggleInputExpansion(index)}
                            >
                              <div className='d-flex flex-column align-items-start'>
                                <span className="small text-white">{input.name}</span>
                                <span className="text-secondary font-weight-light" style={{ fontSize: '0.7rem' }}>{input.type}</span>
                              </div>
                            </div>
                            {!isExpanded && (
                              <div className="position-relative flex-fill input-with-copy-hover">
                                <input
                                  type="text"
                                  className="form-control form-control-sm border-0"
                                  placeholder={input.type}
                                  value={currentValue}
                                  onChange={(e) => handleInputChange(index, e.target.value)}
                                  style={{ backgroundColor: 'var(--bs-body-bg)', color: 'white', fontSize: '0.7rem', paddingRight: '1.5rem', minHeight: '30px' }}
                                />
                                <div className="copy-icon-hover" style={{ position: 'absolute', right: '8px', top: '40%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
                                  <CopyToClipboard tip="Copy" icon="fa-copy" direction="top" getContent={() => currentValue}>
                                    <span style={{ pointerEvents: 'auto' }}>
                                      <i className="far fa-copy" style={{ color: 'var(--bs-secondary)', fontSize: '0.75rem' }}></i>
                                    </span>
                                  </CopyToClipboard>
                                </div>
                              </div>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="mt-2 position-relative input-with-copy-hover">
                              <textarea
                                className="form-control form-control-sm border-0"
                                placeholder={input.type}
                                value={currentValue}
                                onChange={(e) => handleInputChange(index, e.target.value)}
                                style={{ backgroundColor: 'var(--bs-body-bg)', color: 'white', fontSize: '0.7rem', paddingRight: '1.5rem', minHeight: '80px', resize: 'vertical' }}
                              />
                              <div className="copy-icon-hover" style={{ position: 'absolute', right: '8px', top: '8px', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}>
                                <CopyToClipboard tip="Copy" icon="fa-copy" direction="top" getContent={() => currentValue}>
                                  <span style={{ pointerEvents: 'auto' }}>
                                    <i className="far fa-copy" style={{ color: 'var(--bs-secondary)', fontSize: '0.75rem' }}></i>
                                  </span>
                                </CopyToClipboard>
                              </div>
                              <input
                                type="hidden"
                                value={currentValue}
                                onChange={(e) => handleInputChange(index, e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })
                  }
                  {/* Call Data and Parameters */}
                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <CopyToClipboard tip="Copy Call Data" icon="fa-clipboard" direction="bottom" getContent={getEncodedCall}>
                      <button className="btn btn-sm flex-fill border-0" style={{ minWidth: '120px', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                        <span className="text-secondary">Call data</span>
                        <i className="far fa-copy ms-1 text-secondary"></i>
                      </button>
                    </CopyToClipboard>
                    <CopyToClipboard tip="Copy Parameters" icon="fa-clipboard" direction="bottom" getContent={getEncodedParams}>
                      <button className="btn btn-sm flex-fill border-0" style={{ minWidth: '120px', backgroundColor: 'var(--custom-onsurface-layer-3)' }}>
                        <span className="text-secondary">Parameters</span>
                        <i className="far fa-copy ms-1 text-secondary"></i>
                      </button>
                    </CopyToClipboard>
                  </div>
                </div>
              )}

            {/* Value and Gas Limit */}
            <div className='border-top pt-3'>
              {/* Value */}
              <div className="d-flex align-items-center gap-3 mb-3">
                <label className="text-white mb-2" style={{ fontSize: '0.9rem', minWidth: '75px' }}>
                  <FormattedMessage id="udapp.value" defaultMessage="Value" />
                </label>
                <div className="position-relative flex-fill">
                  <input
                    type="text"
                    className="form-control form-control-sm border-0"
                    placeholder="000000000000000000000000000000000"
                    style={{ backgroundColor: 'var(--bs-body-bg)', color: 'white', flex: 1, paddingRight: '4rem' }}
                  />
                  <Dropdown style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                    <Dropdown.Toggle
                      as={CustomToggle}
                      className="btn-sm border-0 p-0 ps-1 text-secondary rounded"
                      style={{ backgroundColor: 'var(--custom-onsurface-layer-2)', color: 'white' }}
                      icon="fas fa-caret-down ms-2"
                      useDefaultIcon={false}
                    >
                      {widgetState.valueUnit}
                    </Dropdown.Toggle>
                    <Dropdown.Menu style={{ backgroundColor: 'var(--custom-onsurface-layer-2)' }}>
                      <Dropdown.Item className="unit-dropdown-item-hover" onClick={() => dispatch({ type: 'SET_VALUE_UNIT', payload: 'wei' })}>wei</Dropdown.Item>
                      <Dropdown.Item className="unit-dropdown-item-hover" onClick={() => dispatch({ type: 'SET_VALUE_UNIT', payload: 'gwei' })}>gwei</Dropdown.Item>
                      <Dropdown.Item className="unit-dropdown-item-hover" onClick={() => dispatch({ type: 'SET_VALUE_UNIT', payload: 'finney' })}>finney</Dropdown.Item>
                      <Dropdown.Item className="unit-dropdown-item-hover" onClick={() => dispatch({ type: 'SET_VALUE_UNIT', payload: 'ether' })}>ether</Dropdown.Item>
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
                      color: 'var(--bs-primary)',
                      cursor: 'pointer',
                      zIndex: 1
                    }}
                    onClick={() => {
                      if (widgetState.gasLimit === '0') {
                        // Switch from auto to custom - set a default value
                        dispatch({ type: 'SET_GAS_LIMIT', payload: '3000000' })
                      } else {
                        // Switch from custom to auto - set to 0
                        dispatch({ type: 'SET_GAS_LIMIT', payload: '0' })
                      }
                    }}
                  >
                    {widgetState.gasLimit === '0' ? 'auto' : 'custom'}
                  </span>
                  <input
                    type="text"
                    className="form-control form-control-sm border-0"
                    placeholder="0000000"
                    value={widgetState.gasLimit}
                    onChange={(e) => dispatch({ type: 'SET_GAS_LIMIT', payload: e.target.value })}
                    disabled={widgetState.gasLimit === '0'}
                    style={{
                      backgroundColor: 'var(--bs-body-bg)',
                      color: 'white',
                      flex: 1,
                      paddingLeft: '4rem',
                      opacity: widgetState.gasLimit === '0' ? 0.6 : 1,
                      cursor: widgetState.gasLimit === '0' ? 'not-allowed' : 'text'
                    }}
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
