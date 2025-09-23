import { Plugin } from '@remixproject/engine'
import { QueryParams } from '@remix-project/remix-lib'

const profile = {
  name: 'ai-dapp-generator',
  displayName: 'AI DApp Generator',
  description: 'AI-powered DApp frontend generator',
  methods: ['generateDapp', 'updateDapp', 'resetDapp', 'getContext', 'getLastGeneratedDapp'],
  events: ['dappGenerated', 'dappUpdated', 'generationProgress'],
  version: '1.0.0'
}

interface GenerateDappOptions {
  description: string
  address: string
  abi: any[]
  chainId: string | number
  contractName: string
}

interface DappGenerationContext {
  address: string
  messages: any[]
}

export class AIDappGenerator extends Plugin {
  private contexts: Map<string, DappGenerationContext> = new Map()

  constructor() {
    super(profile)
  }

  /**
   * Generate a new DApp or update an existing one
   */
  async generateDapp(options: GenerateDappOptions): Promise<string> {
    try {
      await this.call('notification', 'toast', 'Generating the DApp, please wait... it can take up to 2 minutes depending on the contract complexity.')
      this.emit('generationProgress', { status: 'started', address: options.address })

      const context = this.getOrCreateContext(options.address)

      // Check if this is an update or initial generation
      const isUpdate = context.messages.length > 0

      const message = isUpdate
        ? this.createUpdateMessage(options.description)
        : this.createInitialMessage(options)

      context.messages.push({ role: 'user', content: message })

      const htmlContent = await this.callLLMAPI(context.messages)

      // Update context with LLM response
      context.messages.push({ role: 'assistant', content: htmlContent })
      this.saveContext(options.address, context)

      this.emit('dappGenerated', {
        address: options.address,
        content: htmlContent,
        isUpdate
      })

      await this.call('notification', 'toast', 'The DApp has been generated successfully!')

      return htmlContent

    } catch (error) {
      await this.call('terminal', 'log', { type: 'error', value: error.message })
      throw error
    }
  }

  /**
   * Update an existing DApp with new description
   */
  async updateDapp(address: string, description: string): Promise<string> {
    const context = this.getOrCreateContext(address)

    if (context.messages.length === 0) {
      throw new Error('No existing DApp found for this address. Please generate one first.')
    }

    const message = this.createUpdateMessage(description)
    context.messages.push({ role: 'user', content: message })

    try {
      const htmlContent = await this.callLLMAPI(context.messages)
      context.messages.push({ role: 'assistant', content: htmlContent })
      this.saveContext(address, context)

      this.emit('dappUpdated', { address, content: htmlContent })
      return htmlContent

    } catch (error) {
      // Remove the failed message from context
      context.messages.pop()
      throw error
    }
  }

  /**
   * Reset the conversation history for a specific address
   */
  async resetDapp(address: string): Promise<void> {
    this.contexts.delete(address)
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('ai-dapp-' + address)
    }
  }

  /**
   * Get the conversation history for debugging
   */
  async getContext(address: string): Promise<DappGenerationContext> {
    return this.getOrCreateContext(address)
  }

  private getOrCreateContext(address: string): DappGenerationContext {
    if (this.contexts.has(address)) {
      return this.contexts.get(address)!
    }

    // Try to load from localStorage
    let messages: any[] = []
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('ai-dapp-' + address)
      if (stored) {
        try {
          messages = JSON.parse(stored)
        } catch (e) {
          console.warn('Failed to parse stored messages for', address)
        }
      }
    }

    const context: DappGenerationContext = { address, messages }
    this.contexts.set(address, context)
    return context
  }

  async getLastGeneratedDapp(address: string): Promise<string | null> {
    const context = await this.getContext(address)
    if (context) {
      for (let i = context.messages.length - 1; i >= 0; i--) {
        if (context.messages[i].role === 'assistant') {
          return context.messages[i].content
        }
      }
    }
    return null
  }

  private saveContext(address: string, context: DappGenerationContext): void {
    this.contexts.set(address, context)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ai-dapp-' + address, JSON.stringify(context.messages))
    }
  }

  private createInitialMessage(options: GenerateDappOptions): string {
    const providerCode = this.getProviderCode()

    return `Create a website using React and ethers.js v6 (cdn url: https://cdnjs.cloudflare.com/ajax/libs/ethers/6.15.0/ethers.umd.min.js) to interact with the smart contract deployed at this address: ${options.address} on ${options.chainId} network. The ABI of the contract is: ${JSON.stringify(options.abi)}.

The website should be built and ready to be deployed.
Return only one file which represents the raw index.html file, without any markdown formatting, put the following code in the header to be able to connect to the blockchain:${providerCode}

Follow the design and features proposed in this description: ${options.description}`
  }

  private createUpdateMessage(description: string): string {
    const providerCode = this.getProviderCode()

    return `Update the website to satisfy the following description: ${description}
Do not return anything else than the raw index.html file, without any markdown formatting, put the following code in the header to be able to connect to the blockchain:${providerCode}`
  }

  private getProviderCode(): string {
    // This is the provider code that was missing from the original implementation
    return `
<script>
  // Remix IDE provider injection
  if (typeof window !== 'undefined' && window.ethereum && window.ethereum.isRemix) {
    window.ethereum = window.ethereum;
  }
</script>`
  }

  private async callLLMAPI(messages: any[]): Promise<string> {
    const param = new QueryParams()
    const apikey = param.get()['fireworksapikey']

    if (!apikey) {
      throw new Error('Fireworks API key not found in URL parameters. Please add ?fireworksapikey=your_key to the URL.')
    }

    const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apikey}`
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/deepseek-v3p1-terminus",
        max_tokens: 4096,
        top_p: 1,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.6,
        messages: messages
      })
    })

    const json = await response.json()

    if (json.error) {
      throw new Error(`LLM API Error: ${JSON.stringify(json.error)}`)
    }

    if (!json.choices || !json.choices[0] || !json.choices[0].message) {
      throw new Error('Invalid response from LLM API')
    }

    return json.choices[0].message.content
  }
}