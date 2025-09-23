/* eslint-disable @nrwl/nx/enforce-module-boundaries */
import { ViewPlugin } from '@remixproject/engine-web'
import React from 'react' // eslint-disable-line
import { PluginViewWrapper } from '@remix-ui/helper'

const _paq = (window._paq = window._paq || [])

const profile = {
  name: 'iframeContent',
  displayName: '',
  description: '',
  location: 'mainPanel',
  methods: ['setContent'],
  events: []
}

/**
 * add context menu which will offer download as pdf and download png.
 * add menu under the first download button to download
 */

export class IframeContent extends ViewPlugin {
  private iframe: HTMLIFrameElement | null = null
  private content: string = ''
  dispatch: React.Dispatch<any> | null = null

  constructor(appManager: any) {
    super(profile)
    this.dispatch = null
  }

  public setContent(content: string) {
    this.content = content
    this.renderComponent()
  }

  setDispatch (dispatch) {
    this.dispatch = dispatch
    this.renderComponent()
  }

  renderComponent() {
    this.dispatch && this.dispatch({})
  }

  render() {
    return (
      <div className="panel" data-id="bottomBarPanelView">
        <PluginViewWrapper plugin={this} />
      </div>
    )
  }
  
  updateComponent() {
    return <iframe srcDoc={this.content} />
  }
}
