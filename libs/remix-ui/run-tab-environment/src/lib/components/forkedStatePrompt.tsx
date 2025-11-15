import React from "react"
import { FormattedMessage } from "react-intl"

export function ForkedStatePrompt() {
  return (
    <div data-id="forkVmStateModal">
      <ul className='ms-3'>
        <li><FormattedMessage id="udapp.forkVmStateDesc1"/></li>
        <li><FormattedMessage id="udapp.forkVmStateDesc2"/></li>
      </ul>
      <label id="stateName" className="form-check-label" style={{ fontWeight: 'bolder' }}>
        <FormattedMessage id="udapp.forkStateLabel" />
      </label>
    </div>
  )
}