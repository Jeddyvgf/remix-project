import React, { useContext, useState, useEffect, useRef } from 'react';
import { Button, Form, Row, Col, Card } from 'react-bootstrap';
import { FormattedMessage, useIntl } from 'react-intl';
import { AppContext } from '../../contexts';
import ChatBox from '../ChatBox';
import ImageUpload from '../ImageUpload';
import DeployPanel from '../DeployPanel';
import remixClient from '../../remix-client';

function EditHtmlTemplate(): JSX.Element {
  const intl = useIntl();
  const { appState, dispatch } = useContext(AppContext);
  const { htmlTemplate, title, details } = appState.instance;
  const [localHtmlTemplate, setLocalHtmlTemplate] = useState(htmlTemplate || '');
  const [iframeError, setIframeError] = useState<string>('');
  const [showIframe, setShowIframe] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleUpdateTemplate = (newTemplate: string) => {
    setLocalHtmlTemplate(newTemplate);
    dispatch({
      type: 'SET_INSTANCE',
      payload: {
        htmlTemplate: newTemplate,
      },
    });
  };

  const handleChatMessage = async (message: string) => {
    try {
      // Use the AI DApp Generator plugin to update the DApp
      const htmlContent = await remixClient.call('ai-dapp-generator' as any, 'updateDapp', appState.instance.address, message)
      handleUpdateTemplate(htmlContent)
    } catch (error) {
      console.error('Error updating DApp via chat:', error)
      // Fallback to showing an error message to the user
      // You could add a toast notification here if available
    }
  };

  const handleUpdateFromChat = (code: string) => {
    handleUpdateTemplate(code);
  };


  // Update iframe content when template changes
  useEffect(() => {
    if (iframeRef.current && localHtmlTemplate) {
      setIframeError('');
      setShowIframe(true);

      const iframe = iframeRef.current;

      const handleIframeLoad = () => {
        // Clear any previous errors when iframe loads successfully
        setIframeError('');
      };

      const handleIframeError = () => {
        setIframeError('Failed to load the preview. There may be an error in your HTML template.');
        setShowIframe(false);
      };

      // Add event listeners
      iframe.addEventListener('load', handleIframeLoad);
      iframe.addEventListener('error', handleIframeError);

      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const ext = `<script>window.ethereum = parent.window.ethereum</script>`
          doc.open();
          doc.write(ext + localHtmlTemplate);
          doc.close();

          // Check for script errors in the iframe
          const iframeWindow = iframe.contentWindow;
          if (iframeWindow) {
            iframeWindow.addEventListener('error', (event) => {
              setIframeError(`Preview Error: ${event.error?.message || 'Script error in preview'}`);
            });
          }
        } else {
          setIframeError('Cannot access iframe content. The preview may be blocked by security settings.');
          setShowIframe(false);
        }
      } catch (error) {
        setIframeError(`Preview Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setShowIframe(false);
      }

      // Cleanup function
      return () => {
        iframe.removeEventListener('load', handleIframeLoad);
        iframe.removeEventListener('error', handleIframeError);
      };
    } else if (!localHtmlTemplate) {
      setIframeError('No HTML template provided. Please add content to see the preview.');
      setShowIframe(false);
    }
  }, [localHtmlTemplate]);

  return (
    <Row className="m-0 h-100">
      {/* First Column: Logo, Title, Instructions, Preview */}
      <Col xs={12} lg={8} className="pe-3 d-flex flex-column h-100">
        {/* Logo and Title Section */}
        <Row className="mb-3 flex-shrink-0">
          <Col xs="auto">
            <ImageUpload />
          </Col>
          <Col>
            <Form.Group className="mb-2">
              <Form.Control
                data-id="dappTitle"
                placeholder={intl.formatMessage({ id: 'quickDapp.dappTitle' })}
                value={title}
                onChange={({ target: { value } }) => {
                  dispatch({
                    type: 'SET_INSTANCE',
                    payload: {
                      title: value,
                    },
                  });
                }}
              />
            </Form.Group>
            <Form.Group>
              <Form.Control
                as="textarea"
                rows={2}
                data-id="dappInstructions"
                placeholder={intl.formatMessage({ id: 'quickDapp.dappInstructions' })}
                value={details}
                onChange={({ target: { value } }) => {
                  dispatch({
                    type: 'SET_INSTANCE',
                    payload: {
                      details: value,
                    },
                  });
                }}
              />
            </Form.Group>
          </Col>
        </Row>

        {/* Preview Section */}
        <Row className="flex-grow-1 mb-3">
          <Col xs={12} className="d-flex flex-column h-100">
            <h5 className="mb-2 flex-shrink-0">
              <FormattedMessage id="quickDapp.preview" defaultMessage="Preview" />
            </h5>
            <Card className="border flex-grow-1 d-flex">
              <Card.Body className="p-0 d-flex flex-column">
                {showIframe ? (
                  <iframe
                    ref={iframeRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '400px',
                      border: 'none',
                      backgroundColor: 'white',
                      flex: '1'
                    }}
                    title="dApp Preview"
                    sandbox="allow-popups allow-scripts allow-same-origin allow-forms allow-top-navigation"
                  />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-center p-4">
                    <div>
                      <i className="fas fa-exclamation-triangle text-warning mb-2" style={{ fontSize: '2rem' }}></i>
                      <h6 className="text-muted mb-2">Preview Error</h6>
                      <p className="text-muted small">{iframeError}</p>
                    </div>
                  </div>
                )}
                {iframeError && showIframe && (
                  <div className="alert alert-warning alert-sm m-2 mb-0">
                    <small>
                      <i className="fas fa-exclamation-triangle me-1"></i>
                      {iframeError}
                    </small>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
        <Row>
          {/* Chat Section */}
          <div className="flex-grow-1 mb-3" style={{ minHeight: '300px' }}>
            <ChatBox
              onSendMessage={handleChatMessage}
              onUpdateCode={handleUpdateFromChat}
            />
          </div>
        </Row>
      </Col>

      {/* Second Column: Chat and Deploy Panel */}
      <Col xs={12} lg={4} className="d-flex flex-column h-100">
        {/* Deploy Panel */}
        <div className="flex-shrink-0">
          <DeployPanel />
        </div>
      </Col>
    </Row>
  );
}

export default EditHtmlTemplate;