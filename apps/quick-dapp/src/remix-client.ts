import { PluginClient } from '@remixproject/plugin';
import { createClient } from '@remixproject/plugin-webview';
import { initInstance } from './actions';

class RemixClient extends PluginClient {
  constructor() {
    super();
    createClient(this);
  }

  edit({ address, abi, network, name, devdoc, methodIdentifiers, solcVersion, htmlTemplate }: any): void {
    initInstance({
      address,
      abi,
      network,
      name,
      devdoc,
      methodIdentifiers,
      solcVersion,
      htmlTemplate
    });
  }
}

export default new RemixClient();
