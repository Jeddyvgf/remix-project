import React from 'react'
import { FormattedMessage } from 'react-intl'

export default function DeleteVmStatePrompt() {
  return (
    <div data-id="deleteVmStateModal">
      <ul className='ms-3'>
        <li><FormattedMessage id="udapp.resetVmStateDesc1"/></li>
        <li><FormattedMessage id="udapp.resetVmStateDesc2"/></li>
      </ul>
      <FormattedMessage id="udapp.resetVmStateDesc3"/>
    </div>
  )
}